import * as path from "path";
import { hostname }from "os"
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

type SymConfig = {
  name: string,
  hostName: string,
  port: string,
  aixPassword: string,
  aixUserName: string,
  device: string,
  symNumber: string,
  symUserNumber: string,
  symPassword: string
}

type PowerOnConfig = {
  arg1: SymConfig[]
}

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
    customCommands.push(
      commands.registerCommand(
        "poweron.installPoweron",
        installPoweron
      )
    )
    customCommands.push(
      commands.registerCommand(
        "poweron.deployPoweron",
        deployPoweron
      )
    )

    const configHandler = client.onNotification("workspace/configuration",async () =>{
      const config = workspace.getConfiguration()
      const lochost = hostname()
      let syms =  await config.get("poweron.symConfigurations") as Array<SymConfig>
      syms = syms.map(sym => {sym.device=lochost; return sym})
      client.sendNotification("workspace/didChangeConfiguration",{
        settings: {
         symConfigurations: syms,
        }
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
  const symConfigName = await promptForSym("Validate Poweron")
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

async function installPoweron() {
  const symConfigName = await promptForSym("Install Poweron")

  if (symConfigName) {
    client.sendNotification("workspace/executeCommand", {
      command: "lsp.installPoweron",
      arguments: [
        {
          symConfigName,
          uri: window.activeTextEditor.document.uri.toString()
        }
      ]
    })
  }
}

async function deployPoweron() {
  const symConfigName = await promptForSym("Deploy Poweron")
  if (symConfigName) {
    client.sendNotification("workspace/executeCommand", {
      command: "lsp.deployPoweron",
      arguments: [
        {
          symConfigName,
          uri: window.activeTextEditor.document.uri.toString()
        }
      ]
    })
  }
}

async function promptForSym(title: string): Promise<string> {
  const config = workspace.getConfiguration()
  let syms =  await config.get("poweron.symConfigurations") as Array<SymConfig>
  return await window.showQuickPick(syms.map(sym =>{
    return sym.name
  }),{title}) 
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
