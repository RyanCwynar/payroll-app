require('dotenv').config()
const { GoogleSpreadsheet } = require('google-spreadsheet')
const Sheets = module.exports
const doc = new GoogleSpreadsheet(process.env.SHEET_ID)

const authorize = async() =>{
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_KEY,
  });
}

Sheets.update  = async (row = 0, value = 0) => {
  return await Sheets.updateCell(row, 1, value)
}

let sheet

(async function(){
  await authorize()
  await doc.loadInfo()
  sheet = doc.sheetsByTitle.Inputs
  await sheet.loadCells()
})()

Sheets.updateCell  = async (row = 0, col = 0, value = 0) => {
  try {
    let cell = sheet.getCell(row, col)
    cell.value = value
    await sheet.saveUpdatedCells()
    return value
  } catch (err) {
    console.error(err)
  }
}

Sheets.get = (row = 0, col = 1) => {
  try {
    return sheet.getCell(row, col).value
  } catch (err) {
    console.error(err)
  }
}

Sheets.getTotal  = () => Sheets.sumRows(1, 0, 4)

Sheets.sumRows  = (col = 0, start = 0, stop = 0) => {

  try {
    let sum = 0
    for(let i = start; i <= stop; i++){
      const cell = sheet.getCell(i, col)
      sum += cell.value
    }
    return sum || 0
  } catch (err) {
    console.error(err)
  }
}
