import type { NextPage } from 'next'
import Head from 'next/head'
import * as React from 'react'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import WalletLink from 'walletlink'
import { pxlpepes, moonpepes } from '../abi/abi'
import { env } from 'process'

const Home: NextPage = () => {
  const [addy, setAddy] = React.useState('')

  const connect = async () => {
    const web3Modal = new Web3Modal({
      cacheProvider: true,
      theme: 'dark',
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: env.INFURAID,
            rpc: {
              1: `https://mainnet.infura.io/v3/${env.INFURAID}`
            }
          }
        },
        walletlink: {
          package: WalletLink,
          options: {
            appName: 'Cool x Clones',
            infuraId: env.INFURAID
          }
        }
      }
    })
    const instance = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(instance)
    const signer = provider.getSigner()
    const address = await signer.getAddress()
    const ensName = await provider.lookupAddress(address)
    if (ensName && ensName !== '') {
      setAddy(ensName)
    } else {
      setAddy(`${address.substring(0, 6)}...${address.substring(38)}`)
    }
    const network = await provider.getNetwork()
    // const isMainnet = Boolean(network.chainId === 1)
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        const newAddress = accounts[0] as string
        const ensName = await provider.lookupAddress(newAddress)
        if (ensName && ensName !== '') {
          setAddy(ensName)
        } else {
          setAddy(`${newAddress.substring(0, 6)}...${newAddress.substring(38)}`)
        }
      }
    }
    const handleChainChanged = (_hexChainId: string) => {
      window.location.reload()
    }
    const handleConenct = (info: { chainId: number }) => {
      console.log(info)
    }
    const handleDisconnect = (_error: { code: number; message: string }) => {
      window.localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER')
    }
    instance.on('accountsChanged', handleAccountsChanged)
    instance.on('chainChanged', handleChainChanged)
    instance.on('connect', handleConenct)
    instance.on('disconnect', handleDisconnect)
    return () => {
      if (instance.removeListener) {
        instance.removeListener('accountsChanged', handleAccountsChanged)
        instance.removeListener('chainChanged', handleChainChanged)
        instance.removeListener('connect', handleConenct)
        instance.removeListener('disconnect', handleDisconnect)
      }
    }
  }

  return (
    <>
      <Head>
        <title>Pxl Pepes</title>
        <meta
          name='description'
          content='Pxl Pepes is a collection of 4200 pixelated Pepes, following your genesis MoonPepe number.'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className='container mx-auto flex flex-col items-center justify-center min-h-screen p-4'>
        <h1 className='text-5xl md:text-[5rem] leading-normal font-extrabold text-gray-700'>
          Pxl Pepes Claim
        </h1>
        {addy === '' ? (
          <a
            className='mt-3 text-sm underline text-violet-500 decoration-dotted underline-offset-2'
            target='_blank'
            rel='noreferrer'
            onClick={connect}>
            Connect wallet
          </a>
        ) : (
          <p>{addy}</p>
        )}
      </main>
    </>
  )
}

export default Home
