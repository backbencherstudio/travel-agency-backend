import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import appConfig from 'src/config/app.config';

export interface JumioConfig {
    apiToken: string;
    apiSecret: string;
    baseUrl: string;
    callbackUrl: string;
}

export interface CreateVerificationRequest {
    userReference: string;
    callbackUrl?: string;
    verificationType?: 'IDENTITY_VERIFICATION' | 'FACE_VERIFICATION' | 'DOCUMENT_VERIFICATION';
    customerInternalReference?: string;
    userConsent?: boolean;
    country?: string;
    documentType?: 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'VISA';
    enabledFields?: string[];
    locale?: string;
}

export interface JumioVerificationResponse {
    timestamp: string;
    scanReference: string;
    redirectUrl: string;
    web: {
        href: string;
    };
    sdk: {
        href: string;
    };
}

export interface JumioVerificationStatus {
    timestamp: string;
    scanReference: string;
    verification: {
        status: string;
        document: {
            type: string;
            country: string;
            number: string;
        };
        identity: {
            firstName: string;
            lastName: string;
            dateOfBirth: string;
            nationality: string;
        };
        verification: {
            confidence: string;
            score: number;
        };
    };
}

@Injectable()
export class JumioService {
    private readonly logger = new Logger(JumioService.name);
    private readonly client: AxiosInstance;
    private readonly config: JumioConfig;

    constructor() {
        this.config = {
            apiToken: appConfig().jumio.api_token,
            apiSecret: appConfig().jumio.api_secret,
            baseUrl: appConfig().jumio.base_url,
            callbackUrl: appConfig().jumio.callback_url,
        };

        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: 30000,
        });

        // Add request interceptor for authentication
        this.client.interceptors.request.use((config) => {
            const timestamp = new Date().toISOString();
            const nonce = crypto.randomBytes(16).toString('hex');

            // Create authorization header
            const authHeader = this.createAuthHeader(
                config.method.toUpperCase(),
                config.url,
                timestamp,
                nonce
            );

            config.headers.set('Authorization', authHeader);
            config.headers.set('User-Agent', 'TravelAgencyBackend/1.0');
            config.headers.set('Content-Type', 'application/json');

            return config;
        });

        // Add response interceptor for logging
        this.client.interceptors.response.use(
            (response) => {
                this.logger.log(`Jumio API ${response.config.method?.toUpperCase()} ${response.config.url} - Success`);
                return response;
            },
            (error) => {
                this.logger.error(`Jumio API ${error.config?.method?.toUpperCase()} ${error.config?.url} - Error: ${error.message}`);
                return Promise.reject(error);
            }
        );
    }

    private createAuthHeader(method: string, url: string, timestamp: string, nonce: string): string {
        const path = new URL(url, this.config.baseUrl).pathname;
        const query = new URL(url, this.config.baseUrl).search;

        // Create the signature string
        const signatureString = [
            method,
            path + query,
            this.config.apiToken,
            timestamp,
            nonce,
        ].join('\n');

        // Create HMAC signature
        const signature = crypto
            .createHmac('sha256', this.config.apiSecret)
            .update(signatureString)
            .digest('hex');

        // Return authorization header
        return `JWS ${this.config.apiToken}:${timestamp}:${nonce}:${signature}`;
    }

    async createVerification(request: CreateVerificationRequest): Promise<JumioVerificationResponse> {
        try {
            const payload = {
                userReference: request.userReference,
                callbackUrl: request.callbackUrl || this.config.callbackUrl,
                verificationType: request.verificationType || 'IDENTITY_VERIFICATION',
                customerInternalReference: request.customerInternalReference,
                userConsent: request.userConsent !== undefined ? request.userConsent : true,
                ...(request.country && { country: request.country }),
                ...(request.documentType && { documentType: request.documentType }),
                ...(request.enabledFields && { enabledFields: request.enabledFields }),
                ...(request.locale && { locale: request.locale }),
            };

            const response = await this.client.post('/initiate', payload);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create Jumio verification', error);
            throw new Error(`Jumio verification creation failed: ${error.message}`);
        }
    }

    async getVerificationStatus(scanReference: string): Promise<JumioVerificationStatus> {
        try {
            const response = await this.client.get(`/scans/${scanReference}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get verification status for ${scanReference}`, error);
            throw new Error(`Failed to get verification status: ${error.message}`);
        }
    }

    async getVerificationDetails(scanReference: string): Promise<any> {
        try {
            const response = await this.client.get(`/scans/${scanReference}/data`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get verification details for ${scanReference}`, error);
            throw new Error(`Failed to get verification details: ${error.message}`);
        }
    }

    async deleteVerification(scanReference: string): Promise<void> {
        try {
            await this.client.delete(`/scans/${scanReference}`);
            this.logger.log(`Successfully deleted verification ${scanReference}`);
        } catch (error) {
            this.logger.error(`Failed to delete verification ${scanReference}`, error);
            throw new Error(`Failed to delete verification: ${error.message}`);
        }
    }

    async getAccountDetails(): Promise<any> {
        try {
            const response = await this.client.get('/account');
            return response.data;
        } catch (error) {
            this.logger.error('Failed to get account details', error);
            throw new Error(`Failed to get account details: ${error.message}`);
        }
    }

    // Helper method to validate Jumio webhook signature
    validateWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.config.apiSecret)
                .update(payload + timestamp)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );
        } catch (error) {
            this.logger.error('Error validating webhook signature', error);
            return false;
        }
    }

    // Helper method to map Jumio status to our internal status
    mapJumioStatus(jumioStatus: string): string {
        const statusMap = {
            'PENDING': 'pending',
            'APPROVED_VERIFIED': 'approved',
            'DENIED_FRAUD': 'denied',
            'DENIED_UNSUPPORTED_ID_TYPE': 'denied',
            'DENIED_UNSUPPORTED_ID_COUNTRY': 'denied',
            'ERROR_NOT_READABLE_ID': 'error',
            'NO_ID_UPLOADED': 'error',
        };

        return statusMap[jumioStatus] || 'pending';
    }
} 