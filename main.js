const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Path to your preload script
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('ExamHelperQTI.html');
}

ipcMain.handle('download-template', async (event, templateName) => {
  try {
    // Get the correct path for the template in both development and production
    const templatePath = app.isPackaged
      ? path.join(process.resourcesPath, 'files', 'templates', templateName)
      : path.join(__dirname, 'files', 'templates', templateName);

    // Verify the template exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Get the downloads directory
    const downloadsPath = app.getPath('downloads');
    const destinationPath = path.join(downloadsPath, templateName);

    // Copy the file
    await fs.promises.copyFile(templatePath, destinationPath);
    console.log(`Downloaded: ${templateName} to ${destinationPath}`);
    
    // Show success dialog
    dialog.showMessageBox({
      type: 'info',
      title: 'Download Complete',
      message: `Template has been downloaded to: ${destinationPath}`,
      buttons: ['OK']
    });

    return destinationPath;
  } catch (error) {
    console.error('Error downloading template:', error);
    // Show error dialog
    dialog.showErrorBox(
      'Download Error',
      `Failed to download template: ${error.message}`
    );
    throw error;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
