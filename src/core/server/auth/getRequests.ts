/// <reference types="@altv/types-server" />
import * as alt from 'alt-server';
import axios from 'axios';
import { getAzureEndpoint } from '../utility/encryption'; // Should be able to safely import this.

export async function getEndpointHealth(): Promise<boolean> {
    const result = await axios.get(`${getAzureEndpoint()}/v1/health`).catch((err) => null);
    if (!result || !result.data) {
        alt.log(`[3L:RP] Connecting to Authentification Service`);
        return await getEndpointHealth();
    }
    alt.log(`[3L:RP] Connected to Authentification Service Successfully`);
    return true;
}

export async function getVersionIdentifier(): Promise<string | null> {
    const result = await axios.get(`${getAzureEndpoint()}/v1/get/version`).catch((err) => null);
    if (!result || !result.data) return null;
    return result.data;
}