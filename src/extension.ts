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

let client: LanguageClient;
export const DEFINETITLE = `Add Variable to DEFINE division`;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join("pols64.exe"));

  const serverOptions: ServerOptions = {
    run: {
      command: serverModule,
      transport: TransportKind.stdio,
    },
    debug: {
      command: serverModule,
      transport: TransportKind.stdio,
    },
};

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{pattern: "**/*"}],
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
    customCommands.push(
      commands.registerCommand(
        "poweron.importPoweron",
        getPoweronList   
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
  const symConfigName = await promptForSym("Validate Poweron", false)
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
  const symConfigName = await promptForSym("Install Poweron", false)

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
  const symConfigNames = await promptForSym("Deploy Poweron", true)
  if (symConfigNames) {
    client.sendNotification("workspace/executeCommand", {
      command: "lsp.deployPoweron",
      arguments: 
        {
          deployToSyms: symConfigNames,
          uri: window.activeTextEditor.document.uri.toString()
        }
      
    })
  }
}

async function promptForSym(title: string, canPickMany: boolean): Promise<string> {
  const config = workspace.getConfiguration()
  let syms =  await config.get("poweron.symConfigurations") as Array<SymConfig>
  return await window.showQuickPick(syms.map(sym =>{
    return sym.name
  }),{title,canPickMany}) 
}

async function promptForPoweronFilter(title: string): Promise<string> {
   return await window.showInputBox({title})
}

type PoweronList_Response = {
  TaskManager_PowerOnList: {
    poweronList: string[]
  }
}

async function getPoweronList(): Promise<void> {
  const config = await promptForSym("Import Poweron(s) - Choose Sym(s)", false)
  if (config) {
  const filter = await promptForPoweronFilter("Search (*=any, ?=any char):")
  if (config) {
    const res = await client.sendRequest("workspace/executeCommand",{
      command: "lsp.getPoweronList",
      arguments: [{
        searchFilter: filter,
        symConfigName: config
      }]
    }) as PoweronList_Response

    if (res) {
      const selected = await getPoweronSelection("Choose Poweron(s)", res.TaskManager_PowerOnList.poweronList)
      if (selected) {
        client.sendRequest("workspace/executeCommand", {
          command: "lsp.importPowerons",
          arguments: [{
            symConfigName: config,
            poweronList: selected,
          }]
        })
      }
    }
   }
  }
}

async function getPoweronSelection(title: string, list: string[]): Promise<string[]> {
  return await window.showQuickPick(list, {title, canPickMany: true})
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
