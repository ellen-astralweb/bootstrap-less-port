#!/usr/bin/env node

/**!
 * Script formatting a Sass-compiled Bootstrap CSS file for comparison with a Less-compiled CSS
 * file.
 *
 * Copyright 2019–2020 Sean Juarez
 *
 * Licensed under MIT (https://github.com/seanCodes/bootstrap-less-port/blob/master/LICENSE)
 */

import fetchBootstrapRepoTagData from './utils/fetch-bs-repo-tag-data.js'
import oops from './utils/oops.js'
import { pathExists } from './utils/path-utils.js'
import { readFileSync, writeFileSync } from 'fs'

const SASS_COMPILED_CSS_REFERENCE_DIR = './test/sass-compiled-css-reference/'
const formatSassCompiledCSSForComparison = function (fileContents) {
	return fileContents
		// Remove extra newlines.
		.replace(
			/\n+/g,
			'\n'
		)
		// Add leading zeroes.
		.replace(
			/([^\w\d])\.(\d)/g,
			'$10.$2'
		)
		// Strip prefixed properties followed by the same, un-prefixed property.
		.replace(
			/(?:^ *-(?:webkit|moz|ms)-(.*?: .*?;\n))*(?= *\1)/gm,
			''
		)
		// Strip MS flexbox properties.
		.replace(
			/^ *-ms-flex-.*\n|^ *display: -ms-(inline-)?flexbox.*\n/gm,
			''
		)
		// Strip certain prefixed WebKit properties.
		.replace(
			/^.*? -webkit-(?:transform|sticky).*;\n/gm,
			''
		)
		// Strip other prefixed stuff (webkit flexbox, input placeholders, animation keyframes).
		.replace(
			/^ *-webkit-box-.*\n|^.*?:-(webkit|moz|ms)-.*?placeholder[^}]+\}\n|^@-webkit-keyframes[\s\S]+?\n\}\n/gm,
			''
		)
		// Strip @supports checks for prefixed properties.
		.replace(
			/^@supports \(\(.*?\) or \((.*?)\)\) \{/gm,
			'@supports ($1) {'
		)
		// Strip sourcemap comments.
		.replace(
			/\/\*#.*\n?/g,
			''
		)
		// Fix slightly-different color (#19692c).
		.replace(
			/#19692c/g,
			'#19692b'
		)
		// Fix slightly-different color (#ba8b00).
		.replace(
			/#ba8b00/g,
			'#b98b00'
		)
		// Fix slightly-different color (#ececf6).
		.replace(
			/#ececf6/g,
			'#ececf5'
		)
		// Fix slightly-different color (#040505).
		.replace(
			/#040505/g,
			'#040405'
		)
		// Extend repeating decimals.
		.replace(
			/(\d+)\.(\d)\2\2\2\2(\d%)/g,
			'$1.$2$2$2$2$2$2$2$3'
		)
		// Fix a certain percentage value.
		.replace(
			/42.857143%/g,
			'42.85714286%'
		)
		// Fix WebKit tap highlight color.
		.replace(
			'-webkit-tap-highlight-color: rgba(0, 0, 0, 0);',
			'-webkit-tap-highlight-color: transparent;'
		)
		// Last, sort and multi-line selectors.
		.replace(
			/(^ *)(?:(?:[[.*:a-z-]|@-)[^\n;/]*)(?:\n\1(?:[[.*:a-z-]|@-)[^\n;/]*)*(?= {)/gm,
			(match, indent) => indent + match
				.replace(/\n/g, ' ')
				.split(/,/)
				.map(selector => selector.replace(/\s+/, ' ').trim())
				.sort()
				.join(`,\n${indent}`)
		)
}

function prefixError(err, messagePrefix) {
	err.message = `${messagePrefix}:\n${err.message}`

	return err
}

async function main([targetVersion]) {
	try {
		({ name: targetVersion } = await fetchBootstrapRepoTagData(targetVersion))
	} catch (err) {
		throw prefixError(err, `Error fetching Bootstrap tag data for version ${targetVersion}`)
	}

	const sassCompiledCSSFilepath = `${SASS_COMPILED_CSS_REFERENCE_DIR}bootstrap-${targetVersion}.css`

	if (! pathExists(sassCompiledCSSFilepath)) {
		oops(`Path "${sassCompiledCSSFilepath}" does not exist. Have you copied the Bootstrap CSS file to the reference directory yet?`, { exit: true })

		return
	}

	let fileContents = ''

	try {
		fileContents = readFileSync(sassCompiledCSSFilepath, 'utf8')
	} catch (err) {
		throw prefixError(err, `Error reading file "${sassCompiledCSSFilepath}"`)
	}

	console.log('Formatting Sass-compiled CSS...')

	fileContents = formatSassCompiledCSSForComparison(fileContents)

	try {
		writeFileSync(sassCompiledCSSFilepath, fileContents)
	} catch (err) {
		throw prefixError(err, `Error writing file "${sassCompiledCSSFilepath}"`)
	}

	console.log('Done.')
}

main(process.argv.slice(2))
