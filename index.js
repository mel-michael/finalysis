const fs = require('fs')
const pdf = require('pdf-parse')

// let dataBuffer = fs.readFileSync('./uploads/gtb_may_31.pdf')

// pdf(dataBuffer).then(function(data) {

//     // number of pages
//     console.log(data.numpages);
//     // number of rendered pages
//     console.log(data.numrender);
//     // PDF info
//     console.log(data.info);
//     // PDF metadata
//     console.log(data.metadata);
//     // PDF.js version
//     // check https://mozilla.github.io/pdf.js/getting_started/
//     console.log(data.version);
//     // PDF text
//     console.log(data.text);

// });

// function render_page(pageData) {
	// check documents https://mozilla.github.io/pdf.js/
// 	let render_options = {
// 		//replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
// 		normalizeWhitespace: false,
// 		//do not attempt to combine same line TextItem's. The default value is `false`.
// 		disableCombineTextItems: false,
// 	}

// 	return pageData.getTextContent(render_options).then(function (textContent) {
// 		let lastY
// 		let text = ''
// 		for (let item of textContent.items) {
// 			if (lastY == item.transform[5] || !lastY) {
// 				text += item.str
// 			} else {
// 				text += '\n' + item.str
// 			}
// 			lastY = item.transform[5]
// 		}
// 		return text
// 	})
// }

// let options = {
// 	pagerender: render_page,
// }

// let dataBuffer = fs.readFileSync('path to PDF file...');

// pdf(dataBuffer,options).then(function(data) {
//     //use new format
//     console.log(data)
// });

const pdf2table = require('pdf2table')

fs.readFile('./uploads/gtb_may_31.pdf', function (err, buffer) {
	if (err) return console.log(err)

	pdf2table.parse(buffer, function (err, rows, rowsdebug) {
		if (err) return console.log(err)

		fs.writeFile('./results/gtb_test_row.json', JSON.stringify(rows, null, 2), function (err) {
			if (err) {
				return console.log(err)
			}
			console.log('row write successful')
			console.log('::::: Calling data extraction function :::::')
			pdfDataExtractor('./results/gtb_test_row.json')
		})
		// console.log(rows);
	})
})

// PDF to JSON
// const PDFParser = require('pdf2json')
// const pdfParser = new PDFParser();

// // console.log(pdfParser)

// pdfParser.on('pdfParser_dataError', (errData) => console.error(errData.parserError))
// pdfParser.on('pdfParser_dataReady', (pdfData) => {
//   console.log('did we get here', pdfData)
// 	fs.writeFile('./gtb_test.json', JSON.stringify(pdfData), function(err) {
//     if (err) {
//       return console.log(err);
//     }
//     console.log('pdfData write successful');
//   });
// })

// pdfParser.loadPDF('./gtb_may_31.pdf')

function pdfDataExtractor(filePath) {
	fs.readFile(filePath, 'utf8', function (err, data) {
		if (err) return console.error(err)
		const ans = formatData(data)
		const filtered = ans.filter((trans) => trans.length === undefined)
		fs.writeFile('./results/gtb_result.json', JSON.stringify(filtered, null, 2), function (err) {
			if (err) {
				return console.log(err)
			}
			console.log(filtered.length, 'data successfuly extracted')
		})
	})
}

function formatData(result) {
	let headerCount = 0
	const jsonData = JSON.parse(result)

	let acc = {}
	let initialBalance

	return jsonData.slice().map((curVal) => {
		if (curVal[0] === 'Opening Balance') {
			initialBalance = parseFloat(curVal[1].trim().replace(/,/g, ''))
		}

		if (curVal.length === 7 || curVal.length === 8) {
			headerCount++
			if (headerCount > 1) {
				let isDebit
				let transAmount
				let column = {}

				if (curVal[0].toLowerCase() === 'trans. date') {
					return curVal
				}

				Object.keys(acc).forEach((key, ind) => {
					if (ind < 3) {
						return (column[key] = curVal[ind])
					}

					if (key.toLowerCase() === 'debits') {
						transAmount = parseFloat(curVal[ind].trim().replace(/,/g, ''))
						const balAmount = parseFloat(curVal[ind + 1].trim().replace(/,/g, ''))

						isDebit = balAmount < initialBalance
						initialBalance = balAmount
						return (column[key] = isDebit ? transAmount : 0)
					}

					if (key.toLowerCase() === 'credits') {
						return (column[key] = isDebit ? 0 : transAmount)
					}

					if (key.toLowerCase() === 'balance') {
						return (column[key] = initialBalance)
					}

					return (column[key] = curVal[ind - 1])
				})

				return column
			}
			// save column header
			if (headerCount === 1) {
				curVal.forEach((val) => {
					const key = val.trim().replace(/\.|\s/g, '')
					acc[key] = ''
				})
				return curVal
			}
		}

		return curVal
	})
}
