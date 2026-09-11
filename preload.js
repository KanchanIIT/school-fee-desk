const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('schoolAPI',{
  getState:()=>ipcRenderer.invoke('app:state'), setupPin:p=>ipcRenderer.invoke('auth:setupPin',p), verifyPin:p=>ipcRenderer.invoke('auth:verifyPin',p), changePin:(a,b)=>ipcRenderer.invoke('auth:changePin',a,b),
  saveSettings:s=>ipcRenderer.invoke('settings:save',s), cloudSignIn:(e,p)=>ipcRenderer.invoke('cloud:signin',e,p), cloudSignOut:()=>ipcRenderer.invoke('cloud:signout'), cloudSync:()=>ipcRenderer.invoke('cloud:sync'),
  saveStudent:s=>ipcRenderer.invoke('student:save',s),deleteStudent:id=>ipcRenderer.invoke('student:delete',id),recordPayment:p=>ipcRenderer.invoke('payment:record',p),exportExcel:()=>ipcRenderer.invoke('excel:export'),
  createBackup:()=>ipcRenderer.invoke('backup:create'),openBackupFolder:()=>ipcRenderer.invoke('backup:openFolder'),openReceipt:p=>ipcRenderer.invoke('receipt:open',p),openWhatsApp:p=>ipcRenderer.invoke('whatsapp:open',p),openInvoices:()=>ipcRenderer.invoke('folder:invoices')
});