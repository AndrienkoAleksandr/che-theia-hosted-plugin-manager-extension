/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import URI from "@theia/core/lib/common/uri";
import { HostedPluginUriPostProcessor } from "@theia/plugin-ext";
import WorkspaceClient, { IRemoteAPI, IWorkspace, IServer, IRestAPIConfig } from '@eclipse-che/workspace-client';

@injectable()
export class CheWorkspaceHostedPluginUriPostProcessor implements HostedPluginUriPostProcessor {
    protected restApiClient: IRemoteAPI;

    constructor() {
        const restAPIConfig: IRestAPIConfig = {};
        restAPIConfig.baseUrl = process.env.CHE_API;
        const token = process.env.CHE_MACHINE_TOKEN;
        if (token) {
            restAPIConfig.headers = {};
            restAPIConfig.headers['Authorization'] = "Bearer " + token;
        }
        this.restApiClient = WorkspaceClient.getRestApi(restAPIConfig);
    }

    async processUri(uri: URI): Promise<URI> {
        const hostedPluginTheiaInstanceServer = await this.getHostedPluginTheiaInnstanceServer();
        if (!hostedPluginTheiaInstanceServer) {
            throw new Error('No server with type "ide-dev" found.');
        }

        const externalUri = new URI(hostedPluginTheiaInstanceServer.url);
        return externalUri;
    }

    /**
     * Searches for server which exposes hosted Theia instance.
     * The server label is the attribute "type": "ide-dev".
     */
    protected async getHostedPluginTheiaInnstanceServer(): Promise<IServer | undefined> {
        const workspace = await this.getCurrentWorkspace();
        if (!workspace.runtime) {
            throw new Error('Workspace is not running.');
        }

        const machines = workspace.runtime.machines;
        for (let machineName in machines) {
            const servers = machines[machineName].servers;
            for (let serverName in servers) {
                const serverAttributes = servers[serverName].attributes;
                if (serverAttributes && serverAttributes['type'] === 'ide-dev') {
                    return servers[serverName];
                }
            }
        }
        return undefined;
    }

    protected async getCurrentWorkspace(): Promise<IWorkspace> {
        const workspaceId = process.env.CHE_WORKSPACE_ID;
        if (!workspaceId) {
            throw new Error('Environment variable CHE_WORKSPACE_ID is not set.');
        }
        return await this.restApiClient.getById<IWorkspace>(workspaceId);
    }

}
