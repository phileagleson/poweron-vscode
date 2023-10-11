import * as path from "path";
import {
  commands,
  ExtensionContext,
  window,
  workspace,
} from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;
export const DEFINETITLE = `Add Variable to DEFINE division`;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join("pols64.exe"));

  const serverOptions: ServerOptions = {
    run: {
      command: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      command: serverModule,
      transport: TransportKind.ipc,
    },
};

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "poweron" }],
    progressOnInitialization: true,
  };

  client = new LanguageClient(
    "poweronlsp",
    "PowerOn Language Server",
    serverOptions,
    clientOptions
  );

  client.onReady().then(() => {
    const customCommands = []
    customCommands.push(
      commands.registerCommand(
        "poweron.showDataTypeNotification",
        handleNotification
      ),
    )

    customCommands.push(
      commands.registerCommand(
        "poweron.validatePoweron",
        validatePoweron
      )
    )

    const configHandler = client.onNotification("workspace/configuration",() =>{
      const config = workspace.getConfiguration()
      let syms =  config.get("poweron.symConfigurations") as Array<any>
      client.sendNotification("workspace/didChangeConfiguration",{
        symConfigurations: syms,
      })
    })
  
    context.subscriptions.push(...customCommands,configHandler);

  });

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

async function validatePoweron() {
  const config = workspace.getConfiguration()
  let syms =  config.get("poweron.symConfigurations") as Array<any>

  console.log({syms})

  const symConfigName = await window.showQuickPick(syms.map(sym =>{
    return sym.name
  })) 

  console.log({uri:window.activeTextEditor.document.uri.toString()})

  if (symConfigName) {
    client.sendNotification("workspace/executeCommand", {
      command: "lsp.validatePoweron",
      arguments: [
        {
          symConfigName,
          uri: window.activeTextEditor.document.uri.toString()
        }
      ]

    })
  }

}

async function handleNotification(arg1: any, arg2: any, arg3: any) {
  const dataType = await window.showQuickPick([
    "CHARACTER",
    "CODE",
    "DATE",
    "FLOAT",
    "MONEY",
    "NUMBER",
    "RATE",
  ]);
  const { uri, varName } = arg1;
  await client.sendRequest("workspace/executeCommand", {
    command: `lsp.addVarToDefine`,
    arguments: [
      {
        uri,
        varName,
        dataType,
      },
    ],
  });
}
