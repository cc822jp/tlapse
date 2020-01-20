const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const chalk = require('chalk')
const ms = require('ms')
const mkdirp = require('mkdirp')
const dateFormat = require('dateformat')

async function takeScreenshot(page, url, waitUntil = 'networkidle2') {
  await page.goto(url, { waitUntil })
  return page.screenshot()
}

async function addScreenshot(page, argv) {
  try {
    // Ensure directory exists
    mkdirp.sync(argv.directory)

    // Get screenshot as a buffer but don't write to disk yet
    const screenshotBuffer = await takeScreenshot(page, argv._[0], argv.until)

    // Read screenshots directory
    const recentFiles = fs.readdirSync(argv.directory).reverse()

    // Pick last file
    const lastFile = recentFiles[0]

    // For logging
    const now = dateFormat(Date.now(), 'hh:MM:ss')

    // Check if the last file is the same as the screenshot buffer
    if (
      !argv.duplicate &&
      lastFile &&
      fs
        // Get full path as readdir just returns file names, not full path
        .readFileSync(path.join(argv.directory, lastFile))
        .equals(screenshotBuffer)
    ) {
      // Duplicate
      console.log(chalk.gray(now, 'Duplicate screenshot, skipping'))
    } else {
      // Write screenshot to disk
      const filename = path.join(argv.directory, `${Date.now()}.png`)
      fs.writeFileSync(filename, screenshotBuffer)
      console.log(chalk.green(now, 'Screenshot saved'))
    }
  } catch (err) {
    console.log(chalk.red('Failed to take screenshot'))
    console.log(err)
  }
}

module.exports = async function(argv) {
  console.log(chalk.gray('Screenshots directory'), argv.directory)
  console.log(chalk.gray('Screenshots interval'), argv.every)
  console.log(
    chalk.gray('Page viewport'),
    argv.viewport.width,
    'x',
    argv.viewport.height
  )
  console.log(chalk.gray('URL'), argv._[0])

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ['--ignore-certificate-errors', '--enable-feature=NetworkService']
  })
  const page = await browser.newPage()

  page.setViewport({
    ...argv.viewport,
    deviceScaleFactor: 2
  })

  await addScreenshot(page, argv)

  setInterval(() => addScreenshot(page, argv), ms(argv.every))
}
