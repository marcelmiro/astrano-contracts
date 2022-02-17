import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import ProjectFactoryArtifact from '../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json'
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import AstranoVestingWalletArtifact from '../artifacts/contracts/AstranoVestingWallet.sol/AstranoVestingWallet.json'
import UniswapV2FactoryMockArtifact from '../artifacts/contracts/mocks/UniswapV2FactoryMock.sol/UniswapV2FactoryMock.json'
import UniswapV2Router02MockArtifact from '../artifacts/contracts/mocks/UniswapV2Router02Mock.sol/UniswapV2Router02Mock.json'
import TokenFactoryArtifact from '../artifacts/contracts/TokenFactory.sol/TokenFactory.json'
import CrowdsaleFactoryArtifact from '../artifacts/contracts/CrowdsaleFactory.sol/CrowdsaleFactory.json'
import VestingWalletFactoryArtifact from '../artifacts/contracts/VestingWalletFactory.sol/VestingWalletFactory.json'

/* eslint-disable node/no-missing-import */
import { ProjectFactory } from '../src/types/ProjectFactory'
import { Token } from '../src/types/Token'
import { AstranoVestingWallet } from '../src/types/AstranoVestingWallet'
import { UniswapV2FactoryMock } from '../src/types/UniswapV2FactoryMock'
import { UniswapV2Router02Mock } from '../src/types/UniswapV2Router02Mock'
import { TokenFactory } from '../src/types/TokenFactory'
import { CrowdsaleFactory } from '../src/types/CrowdsaleFactory'
import { VestingWalletFactory } from '../src/types/VestingWalletFactory'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	// constants: { AddressZero },
} = ethers
const { deployContract } = waffle

describe('Token', async function () {
	const wallet = '0xD3f0Bcdb117C05b988159d7244eC7c19faB0d56f'
	let signers: SignerWithAddress[]
	let projectFactory: ProjectFactory
	let astranoVestingWallet: AstranoVestingWallet
	let uniswapV2Router: UniswapV2Router02Mock
	let pairToken: Token

	const creationFee = ethers.utils.parseEther('0.1')
	const tokenFee = 100 // 1%

	before(async function () {
		signers = await getSigners()

		astranoVestingWallet = (await deployContract(
			signers[0],
			AstranoVestingWalletArtifact,
			[wallet, 300, 300],
		)) as AstranoVestingWallet

		const uniswapV2Factory = (await deployContract(
			signers[0],
			UniswapV2FactoryMockArtifact,
		)) as UniswapV2FactoryMock

		uniswapV2Router = (await deployContract(
			signers[0],
			UniswapV2Router02MockArtifact,
			[uniswapV2Factory.address],
		)) as UniswapV2Router02Mock

		pairToken = (await deployContract(signers[0], TokenArtifact, [
			'Binance-Peg USD Coin',
			'USDC',
			'21000000',
			signers[0].address,
		])) as Token

		const tokenFactory = (await deployContract(
			signers[0],
			TokenFactoryArtifact,
		)) as TokenFactory

		const crowdsaleFactory = (await deployContract(
			signers[0],
			CrowdsaleFactoryArtifact,
		)) as CrowdsaleFactory

		const vestingWalletFactory = (await deployContract(
			signers[0],
			VestingWalletFactoryArtifact,
		)) as VestingWalletFactory

		projectFactory = (await deployContract(
			signers[0],
			ProjectFactoryArtifact,
			[
				wallet,
				astranoVestingWallet.address,
				creationFee,
				tokenFee,
				uniswapV2Router.address,
				pairToken.address,
				tokenFactory.address,
				crowdsaleFactory.address,
				vestingWalletFactory.address,
			],
		)) as ProjectFactory
	})

	/* it('Should create contract with correct parameters', async function () {
		const [
			_wallet,
			_feeVestingWallet,
			_creationFee,
			_tokenFee,
			_router,
			_pairToken,
		] = await Promise.all([
			projectFactory.wallet(),
			projectFactory.feeVestingWallet(),
			projectFactory.creationFee(),
			projectFactory.tokenFee(),
			projectFactory.router(),
			projectFactory.pairToken(),
		])

		expect(_wallet).to.equal(wallet)
		expect(_feeVestingWallet).to.equal(astranoVestingWallet.address)
		expect(_creationFee).to.equal(creationFee)
		expect(_tokenFee).to.equal(tokenFee)
		expect(_router).to.equal(uniswapV2Router.address)
		expect(_pairToken).to.equal(pairToken.address)
	}) */

	/* it('Test createProject()', async function () {
		const newProject = {
			tokenName: 'My Custom Token',
			tokenSymbol: 'MCT',
			tokenTotalSupply: 1200,
			tokenLockStartIn: 300,
			tokenLockDuration: 200,
			crowdsaleRate: 10,
			crowdsaleCap: 120,
			crowdsaleIndividualCap: 100,
			crowdsaleMinPurchaseAmount: 5,
			crowdsaleGoal: 80,
			crowdsaleOpeningTime: Math.ceil(Date.now() / 1000) + 300,
			crowdsaleClosingTime: Math.ceil(Date.now() / 1000) + 600,
			liquidityRate: 9,
			liquidityLockStartIn: 400,
			liquidityLockDuration: 500,
			liquidityPercentage: 60,
		}

		await projectFactory.createProject(newProject, { value: creationFee })
	}) */
})
