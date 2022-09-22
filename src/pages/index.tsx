import type { NextPage } from 'next'
import Head from 'next/head'
import * as React from 'react'
import { BigNumber, ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import WalletLink from 'walletlink'
import {
  moonpepes,
  // moonpepes,
  pxlpepes
} from '../abi/abi'
import { env } from 'process'

const moonPepesContract = '0x02f74badce458387ecaef9b1f229afb5678e9aad'
const pxlPepesContract = '0xac12014a5884c3b038855a4e0c2419b2eccebcaf'

const Home: NextPage = () => {
  const [address, setAddress] = React.useState('')
  const [displayAddress, setDisplayAddress] = React.useState('')
  const [isMainnet, setIsMainnet] = React.useState(true)
  const [ids, setIds] = React.useState('')
  // const [provider, setProvider] =
  // React.useState<ethers.providers.Web3Provider>()
  const [signer, setSigner] = React.useState<ethers.providers.JsonRpcSigner>()
  const [txn, setTxn] = React.useState('')
  const [minting, setMinting] = React.useState(false)

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
    // setProvider(provider)
    const signer = provider.getSigner()
    setSigner(signer)
    const walletAddress = await signer.getAddress()
    setAddress(walletAddress)
    const ensName = await provider.lookupAddress(walletAddress)
    if (ensName && ensName !== '') {
      setDisplayAddress(ensName)
    } else {
      setDisplayAddress(
        `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
      )
    }
    const network = await provider.getNetwork()
    const mainnet = Boolean(network.chainId === 1)
    if (!mainnet) {
      setIsMainnet(false)
    }

    const mp = new ethers.Contract(moonPepesContract, moonpepes, signer)
    const mpResult: BigNumber[] = await mp.tokensOfOwner(walletAddress)
    const moonPepeIds = mpResult.map((i) => i.toNumber())
    const pp = new ethers.Contract(pxlPepesContract, pxlpepes, signer)
    const claimIds = []
    for (let i = 0; i < moonPepeIds.length; i++) {
      const exists = await pp.exists(moonPepeIds[i])
      if (!exists) {
        claimIds.push(moonPepeIds[i])
      }
    }
    if (claimIds.length > 0) {
      setIds(claimIds.slice(0, 20).join(', '))
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        const newAddress = accounts[0] as string
        setAddress(newAddress)
        const ensName = await provider.lookupAddress(newAddress)
        if (ensName && ensName !== '') {
          setDisplayAddress(ensName)
        } else {
          setDisplayAddress(
            `${newAddress.substring(0, 6)}...${newAddress.substring(38)}`
          )
        }
      }
    }
    const handleChainChanged = (_hexChainId: string) => {
      console.log(_hexChainId)
      window.location.reload()
    }
    const handleConenct = (info: { chainId: number }) => {
      console.log(info)
    }
    const handleDisconnect = (error: { code: number; message: string }) => {
      console.log(`Error [${error.code}]: ${error.message}`)
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

  const mint = async () => {
    try {
      const pp = new ethers.Contract(
        '0xac12014a5884c3b038855a4e0c2419b2eccebcaf',
        pxlpepes,
        signer
      )
      const mintIds = ids
        .replace(/\s/g, '')
        .split(',')
        .map((i) => parseInt(i))
        .slice(0, 20)
      const transactionId = await pp.mint(address, mintIds)
      setTxn(transactionId.hash)
      setMinting(true)
      await transactionId.wait()
      setMinting(false)
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <div className='bg-black'>
      <Head>
        <title>Pxl Pepes</title>
        <meta
          name='description'
          content='Pxl Pepes is a collection of 4200 pixelated Pepes, following your genesis MoonPepe number.'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className='container mx-auto flex flex-col items-center justify-center min-h-screen p-4'>
        <h1 className='text-5xl md:text-[5rem] leading-normal font-extrabold text-green'>
          Pxl Pepes Claim
        </h1>
        {displayAddress === '' ? (
          <button
            className='cursor:pointer mt-3 px-4 py-2 rounded-md bg-green text-sm text-black shadow-lg'
            onClick={connect}>
            Connect Wallet
          </button>
        ) : (
          <>
            {!isMainnet ? (
              <p className='text-white text-2xl'>
                Please switch to Ethereum Mainnet.
              </p>
            ) : (
              <>
                <p className='my-2 text-white text-2xl'>{displayAddress}</p>
                <input
                  type='text'
                  value={ids}
                  placeholder='Comma separated ids'
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIds(e.target.value)
                  }
                />
                <button
                  type='submit'
                  className='cursor:pointer mt-3 px-4 py-2 rounded-md bg-green text-sm text-black shadow-lg'
                  onClick={mint}>
                  Mint
                </button>
                {minting && <p className='text-white my-2'>Minting...</p>}
                {txn !== '' && (
                  <p className='text-white'>
                    Transaction:{' '}
                    <a
                      href={`https://etherscan.io/tx/${txn}`}
                      target='_blank'
                      rel='noreferrer'
                      className='text-green underline'>
                      {`${txn.substring(0, 6)}...${txn.substring(62)}`}
                    </a>
                  </p>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Home
