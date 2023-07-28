"use client";

import { Core } from '@walletconnect/core';
import Client, { Web3Wallet } from "@walletconnect/web3wallet";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { useEffect, useState } from "react";
import { ConnectWallet, useSDK } from "@thirdweb-dev/react";
import { ethers } from "ethers";

const core = new Core({
  projectId: process.env.WC_PROJECT_ID,
});


export default function Wallet() {
  const [initialized, setInitialized] = useState(false);
  const [wallet, setWallet] = useState<Client | null>(null);

  const sdk = useSDK();
  const [smartWalletAddr, setSmartWalletAddr] = useState('');

  const [wcUri, setWcUri] = useState('');

  useEffect(() => {
    const init = async () => {
      const wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: 'ERC1271 Gateway',
          description: '',
          url: '',
          icons: []
        }
      })
      setWallet(wallet);
    };
    init().then(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!wallet) return;

    wallet.on('session_proposal', async proposal => {
      console.log('session_proposal', proposal);

      const approvedNamespaces = buildApprovedNamespaces({
        proposal: proposal.params,
        supportedNamespaces: {
          eip155: {
            chains: ["eip155:5"],
            methods: [
              "eth_sign", "eth_signTransaction", "eth_signTypedData", "eth_signTypedData_v4",
              "personal_sign", "eth_sendTransaction"
            ],
            events: ["accountsChanged", "chainChanged"],
            accounts: [`eip155:5:${smartWalletAddr}`]
          }
        },
      });

      const session = await wallet.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      })
      console.log('approved session', session);
    });

    wallet.on('session_delete', async event => {
      console.log('session_delete', event);
    });

    wallet.on('auth_request', async request => {
      console.log('auth_request', request);
    });

    wallet.on('session_request', async req => {
      console.log('session_request', req);

      const { topic, id } = req;
      const { request } = req.params;

      if (sdk?.wallet === undefined) {
        console.log('sdk is undefined');
        await wallet.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error'
            }
          }
        });
        return;
      }

      const messageBytes = ethers.utils.arrayify(request.params[0]);
      const message = ethers.utils.toUtf8String(messageBytes);
      const signature = await sdk.wallet.sign(message);

      await wallet.respondSessionRequest({
        topic,
        response: {
          id,
          result: signature,
          jsonrpc: '2.0'
        }
      });
    });
  }, [wallet, smartWalletAddr, sdk]);

  const onConnect = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    await wallet?.core.pairing.pair({ uri: wcUri });
  }

  return (
    <div>
      <p>ERC-1271 Gateway</p>
      Initialized: {initialized ? 'true' : 'false'}

      <br/>
      <ConnectWallet btnTitle='Connect Owner Wallet' />

      <br/>
      <p>Smart Wallet address:</p>
      <input type='text' value={smartWalletAddr} onChange={e => setSmartWalletAddr(e.target.value)}/>

      <br/>
      <p>WalletConnect URI:</p>
      <input type='text' disabled={!initialized} onChange={e => setWcUri(e.target.value)}/>
      <button disabled={!initialized} onClick={onConnect}>Connect</button>

    </div>
  );
}