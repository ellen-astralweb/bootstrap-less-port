import color from 'ansi-colors'
import { get } from 'https'
import oops from './oops.js'
import { parse } from 'url'
import { pathExists } from './path-utils.js'
import { relative } from 'path'
import { createWriteStream, realpathSync } from 'fs'

export default async function downloadFile(downloadURL, fileDownloadPath, fileDownloadName) {
	if (! downloadURL)
		throw new Error(`Invalid URL: ${downloadURL}`)
	if (! pathExists(fileDownloadPath))
		throw new Error(`File path does not exist: ${fileDownloadPath}`)

	console.log(`\nDownloading ${color.underline(downloadURL)} to ${fileDownloadPath}${fileDownloadName}...`)

	const { hostname, path } = parse(downloadURL)

	return new Promise((resolve, reject) => {
		get({
			hostname,
			path,
			headers: {
				'User-Agent'      : 'seanCodes/bootstrap-less-port',
				'Accept-Encoding' : 'gzip,deflate',
			},
		}, resp => {
			const requestNotOk = resp.statusCode < 200 || resp.statusCode > 299

			if (requestNotOk) {
				const requestRedirected = resp.statusCode === 302

				if (requestRedirected) {
					console.log(color.dim(`Redirecting to ${color.underline(resp.headers.location)}...`))

					return resolve(downloadFile(resp.headers.location, fileDownloadPath, fileDownloadName))
				}

				oops(`Server returned ${resp.statusCode}`)
				console.log(resp.headers)

				let data = ''

				resp.on('data', chunk => (data += chunk))
				resp.on('end', () => reject(new Error(data)))
			} else {
				const file = createWriteStream(`${fileDownloadPath}${fileDownloadName}.zip`)

				resp.on('data', chunk => file.write(chunk))
				resp.on('end', () => {
					file.end()

					const zipFilePathName = realpathSync(`${fileDownloadPath}${fileDownloadName}.zip`)

					console.log(`Downloaded to ${relative(process.cwd(), zipFilePathName)}`)

					resolve(zipFilePathName)
				})
			}
		}).on('error', reject)
	})
}
