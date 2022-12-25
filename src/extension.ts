/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path'
import { CodeAction, CodeActionKind, commands, ExtensionContext, window } from 'vscode'

import {
 LanguageClient,
 LanguageClientOptions,
 ServerOptions,
 TransportKind
} from 'vscode-languageclient/node'

let client: LanguageClient
export const DEFINETITLE = `Add Variable to DEFINE division`


export function activate(context: ExtensionContext) {
 const serverModule = context.asAbsolutePath(
  process.env['POWERON_SERVER_PATH'] ||
  path.join('node_modules', 'poweron-language-server', 'out', 'main.js')
 )

 const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] }

 const serverOptions: ServerOptions = {
  run: {
   module: serverModule,
   transport: TransportKind.ipc,
  },
  debug: {
   module: serverModule,
   transport: TransportKind.ipc,
   options: debugOptions
  }
 }

 const clientOptions: LanguageClientOptions = {
  documentSelector: [{ scheme: 'file', language: 'poweron' }],
  progressOnInitialization: true,
 }

 client = new LanguageClient(
  'poweronlsp',
  'PowerOn Language Server',
  serverOptions,
  clientOptions
 )

 client.onReady().then(() => {
  context.subscriptions.push(
   commands.registerCommand('poweronlsp.showDataTypeNotification', handleNotification)
  )
 })

 client.start()
}

export function deactivate(): Thenable<void> | undefined {
 if (!client) {
  return undefined
 }
 return client.stop()
}

async function handleNotification(arg1: any, arg2: any, arg3: any) {
 const dataType = await window.showQuickPick(['CHARACTER', 'CODE', 'DATE','FLOAT','MONEY','NUMBER','RATE'])
 const {uri, varName } = arg1
 client.sendRequest('workspace/executeCommand', { command: `lsp.addVarToDefine`, arguments: [{
    uri,
    varName,
    dataType
 }]})
 
 
}
