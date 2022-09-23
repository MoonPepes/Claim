import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
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

type ErrorWithMessage = {
  message: string
}

const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

const toErrorWithMessage = (maybeError: unknown): ErrorWithMessage => {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError))
  }
}

const getErrorMessage = (error: unknown) => {
  return toErrorWithMessage(error).message
}

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
  const [loading, setLoading] = React.useState(false)
  const [mintableIds, setMintableIds] = React.useState<number[]>([])
  const [overTwenty, setOverTwenty] = React.useState(false)
  const [noClaims, setNoClaims] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')

  React.useEffect(() => {
    let interval: NodeJS.Timer
    if (errorMessage !== '') {
      interval = setInterval(() => {
        setErrorMessage('')
      }, 10000)
    }
    return () => clearInterval(interval)
  }, [errorMessage])

  const connect = async () => {
    setLoading(true)
    const web3Modal = new Web3Modal({
      cacheProvider: true,
      theme: 'dark',
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: env.NEXT_PUBLIC_INFURAID,
            rpc: {
              1: `https://mainnet.infura.io/v3/${env.NEXT_PUBLIC_INFURAID}`
            }
          }
        },
        walletlink: {
          package: WalletLink,
          options: {
            appName: 'Cool x Clones',
            infuraId: env.NEXT_PUBLIC_INFURAID
          }
        }
      }
    })
    const instance = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(instance)
    const signer = provider.getSigner()
    setSigner(signer)
    const network = await provider.getNetwork()
    const mainnet = Boolean(network.chainId === 1)
    if (!mainnet) {
      setIsMainnet(false)
      setLoading(false)
      return
    }
    setIsMainnet(true)
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

    const mp = new ethers.Contract(moonPepesContract, moonpepes, signer)
    const mpResult: BigNumber[] = await mp.tokensOfOwner(walletAddress)
    const moonPepeIds = mpResult.map((i) => i.toNumber())
    const pp = new ethers.Contract(pxlPepesContract, pxlpepes, signer)
    const claimIds = []
    for (let i = 0; i < moonPepeIds.length; i++) {
      const exists = await pp.exists(moonPepeIds[i])
      if (!exists) {
        claimIds.push(moonPepeIds[i] as number)
      }
    }
    if (claimIds.length > 0) {
      if (claimIds.length > 20) {
        setOverTwenty(true)
      }
      setMintableIds(claimIds.slice(0, 20))
      setIds(claimIds.slice(0, 20).join(', '))
    } else {
      setNoClaims(true)
    }
    setLoading(false)

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
      const pp = new ethers.Contract(pxlPepesContract, pxlpepes, signer)
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
      const msg = getErrorMessage(e)
      if (msg.includes('user rejected transaction')) {
        setErrorMessage('Transaction Cancelled.')
      } else if (msg.includes('Ledger device')) {
        setErrorMessage('Ledger locked.')
      } else {
        setErrorMessage(msg)
      }
    }
  }

  return (
    <div className='bg-black min-h-screen'>
      <Head>
        <title>Pxl Pepes</title>
        <meta
          name='description'
          content='Pxl Pepes is a collection of 4200 pixelated Pepes, following your genesis MoonPepe number.'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <header>
        <div
          className='relative overflow-hidden bg-no-repeat bg-cover'
          style={{
            backgroundPosition: '50%',
            backgroundImage: 'url("/banner.png")',
            height: '250px'
          }}>
          <div
            className='absolute top-0 right-0 bottom-0 left-0 w-full h-full overflow-hidden bg-fixed'
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
            <div className='flex justify-center items-center h-full'>
              <div className='text-center text-white px-6 md:px-12'>
                <h1 className='text-5xl md:text-[5rem] leading-normal font-extrabold text-green'>
                  Pxl Pepes Claim
                </h1>
                {displayAddress === '' ? (
                  <button
                    type='button'
                    className='inline-block px-6 py-2.5 border-2 border-white text-white font-medium text-xs leading-tight uppercase rounded hover:bg-black hover:bg-opacity-5 focus:outline-none focus:ring-0 transition duration-150 ease-in-out'
                    data-mdb-ripple='true'
                    data-mdb-ripple-color='light'
                    onClick={connect}>
                    Connect Wallet
                  </button>
                ) : (
                  <h3 className='text-3xl font-bold mb-8'>{displayAddress}</h3>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className='container mx-auto flex flex-col items-center justify-center min-h-fit p-4'>
        {loading && (
          <Image src='/loading.gif' alt='Loading...' width={200} height={200} />
        )}
        {!isMainnet && (
          <p className='text-white text-2xl'>
            Please switch to Ethereum Mainnet.
          </p>
        )}
        {isMainnet && displayAddress !== '' && !loading && (
          <>
            <div className='my-8 flex flex-wrap justify-center space-x-2'>
              {mintableIds.map((id) => (
                <div className='my-2 basis-1/5' key={id}>
                  <Image
                    src={`/pp/${id}.png`}
                    className='p-1 bg-white border rounded max-w-xs'
                    width={100}
                    height={100}
                    alt='...'
                  />
                </div>
              ))}
            </div>
            <div className='my-8'>
              {overTwenty && (
                <p className='text-white text-2xl'>🐳 20 at time</p>
              )}
              {noClaims && (
                <p className='text-white text-2xl'>
                  No Pxl Pepe claims available.
                </p>
              )}
              {errorMessage !== '' && (
                <p className='text-red text-2xl'>{errorMessage}</p>
              )}
            </div>
            <input
              type='text'
              value={ids}
              placeholder='Comma separated ids'
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setIds(e.target.value)
              }
              className='hidden'
            />
            {!noClaims && (
              <button
                type='submit'
                className='cursor:pointer mt-3 px-4 py-2 rounded-md bg-green text-sm text-black shadow-lg'
                onClick={mint}>
                Mint
              </button>
            )}
            {minting && <p className='text-white my-2'>Minting...</p>}
            {txn !== '' && (
              <div className='mt-3'>
                <p className='text-white text-2xl'>
                  Transaction:{' '}
                  <a
                    href={`https://etherscan.io/tx/${txn}`}
                    target='_blank'
                    rel='noreferrer'
                    className='text-green underline'>
                    {`${txn.substring(0, 6)}...${txn.substring(62)}`}
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Home
