import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { BigNumber, ContractTransaction } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import ProjectFactoryArtifact from '../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json'
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json'
import AstranoVestingWalletArtifact from '../artifacts/contracts/AstranoVestingWallet.sol/AstranoVestingWallet.json'
import TokenFactoryArtifact from '../artifacts/contracts/TokenFactory.sol/TokenFactory.json'
import CrowdsaleFactoryArtifact from '../artifacts/contracts/CrowdsaleFactory.sol/CrowdsaleFactory.json'
import VestingWalletFactoryArtifact from '../artifacts/contracts/VestingWalletFactory.sol/VestingWalletFactory.json'

/* eslint-disable node/no-missing-import */
import { expectRevert, getTime, setTime } from '../src/helpers'

import { ProjectFactory } from '../src/types/ProjectFactory'
import { Token } from '../src/types/Token'
import { AstranoVestingWallet } from '../src/types/AstranoVestingWallet'
import { IUniswapV2Router02 } from '../src/types/IUniswapV2Router02'
import { IUniswapV2Factory } from '../src/types/IUniswapV2Factory'
import { TokenFactory } from '../src/types/TokenFactory'
import { CrowdsaleFactory } from '../src/types/CrowdsaleFactory'
import { VestingWalletFactory } from '../src/types/VestingWalletFactory'
import { Crowdsale } from '../src/types/Crowdsale'
import { VestingWallet } from '../src/types/VestingWallet'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	getContractAt,
	constants: { AddressZero },
} = ethers
const { deployContract } = waffle

const UNISWAP_FACTORY_ADDR = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const UNISWAP_ROUTER02_ADDR = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

describe.skip('ProjectFactoryMainnet', async function () {
	const wallet = '0xD3f0Bcdb117C05b988159d7244eC7c19faB0d56f'
	let signers: SignerWithAddress[]
	let projectFactory: ProjectFactory
	let astranoVestingWallet: AstranoVestingWallet
	let uniswapV2Factory: IUniswapV2Factory
	let uniswapV2Router: IUniswapV2Router02
	let tokenFactory: TokenFactory
	let crowdsaleFactory: CrowdsaleFactory
	let vestingWalletFactory: VestingWalletFactory
	let pairToken: Token

	const creationFee = ethers.utils.parseEther('0.1')
	const tokenFee = 100

	const projectFactoryArgs = ({
		_wallet = wallet,
		_feeVestingWallet = astranoVestingWallet.address,
		_creationFee = creationFee,
		_tokenFee = tokenFee,
		_router = uniswapV2Router.address,
		_pairToken = pairToken.address,
		_tokenFactory = tokenFactory.address,
		_crowdsaleFactory = crowdsaleFactory.address,
		_vestingWalletFactory = vestingWalletFactory.address,
	} = {}) => [
		_wallet,
		_feeVestingWallet,
		_creationFee,
		_tokenFee,
		_router,
		_pairToken,
		_tokenFactory,
		_crowdsaleFactory,
		_vestingWalletFactory,
	]

	before(async function () {
		signers = await getSigners()

		astranoVestingWallet = (await deployContract(
			signers[0],
			AstranoVestingWalletArtifact,
			[wallet, 300, 300],
		)) as AstranoVestingWallet

		uniswapV2Factory = (await getContractAt(
			'IUniswapV2Factory',
			UNISWAP_FACTORY_ADDR,
		)) as IUniswapV2Factory

		uniswapV2Router = (await getContractAt(
			'IUniswapV2Router02',
			UNISWAP_ROUTER02_ADDR,
		)) as IUniswapV2Router02

		pairToken = (await deployContract(signers[0], TokenArtifact, [
			'Pair Token',
			'PTKN',
			ethers.utils.parseEther((100_000_000).toString()),
			signers[0].address,
		])) as Token

		tokenFactory = (await deployContract(
			signers[0],
			TokenFactoryArtifact,
		)) as TokenFactory

		crowdsaleFactory = (await deployContract(
			signers[0],
			CrowdsaleFactoryArtifact,
		)) as CrowdsaleFactory

		vestingWalletFactory = (await deployContract(
			signers[0],
			VestingWalletFactoryArtifact,
		)) as VestingWalletFactory
	})

	it('Should create contract with correct parameters', async function () {
		const args = [
			wallet,
			astranoVestingWallet.address,
			creationFee,
			tokenFee,
			uniswapV2Router.address,
			pairToken.address,
			tokenFactory.address,
			crowdsaleFactory.address,
			vestingWalletFactory.address,
		]

		projectFactory = (await deployContract(
			signers[0],
			ProjectFactoryArtifact,
			args,
		)) as ProjectFactory

		const [
			_wallet,
			_feeVestingWallet,
			_creationFee,
			_tokenFee,
			_router,
			_pairToken,
			_tokenFactory,
			_crowdsaleFactory,
			_vestingWalletFactory,
		] = await Promise.all([
			projectFactory.wallet(),
			projectFactory.feeVestingWallet(),
			projectFactory.creationFee(),
			projectFactory.tokenFee(),
			projectFactory.router(),
			projectFactory.pairToken(),
			projectFactory.tokenFactory(),
			projectFactory.crowdsaleFactory(),
			projectFactory.vestingWalletFactory(),
		])

		expect(_wallet).to.equal(wallet)
		expect(_feeVestingWallet).to.equal(astranoVestingWallet.address)
		expect(_creationFee).to.equal(creationFee)
		expect(_tokenFee).to.equal(tokenFee)
		expect(_router).to.equal(uniswapV2Router.address)
		expect(_pairToken).to.equal(pairToken.address)
		expect(_tokenFactory).to.equal(tokenFactory.address)
		expect(_crowdsaleFactory).to.equal(crowdsaleFactory.address)
		expect(_vestingWalletFactory).to.equal(vestingWalletFactory.address)
	})

	it('Should revert on create contract with incorrect parameters', async function () {
		const deploys = [
			{
				args: { _tokenFee: 10001 },
				message: 'token fee greater than 10000',
			},
			{
				args: { _wallet: AddressZero },
				message: 'wallet is the zero address',
			},
			{
				args: { _feeVestingWallet: AddressZero },
				message: 'vesting is the zero address',
			},
			{
				args: { _router: AddressZero },
				message: 'router is the zero address',
			},
			{
				args: { _pairToken: AddressZero },
				message: 'pair token is the zero address',
			},
			{
				args: { _tokenFactory: AddressZero },
				message: 'token factory is address(0)',
			},
			{
				args: { _crowdsaleFactory: AddressZero },
				message: 'crowdsale factory is address(0)',
			},
			{
				args: { _vestingWalletFactory: AddressZero },
				message: 'vesting factory is address(0)',
			},
		]

		await Promise.all(
			deploys.map(({ args, message }) =>
				expectRevert(
					deployContract(
						signers[0],
						ProjectFactoryArtifact,
						projectFactoryArgs(args),
					),
					message,
				),
			),
		)
	})

	it('Should allow to set contract variables', async function () {
		const projectFactory = (await deployContract(
			signers[0],
			ProjectFactoryArtifact,
			projectFactoryArgs(),
		)) as ProjectFactory

		const newAddress = signers[1].address
		const newCreationFee = 250
		const newTokenFee = 5000

		const deploys = [
			projectFactory.setWallet(newAddress),
			projectFactory.setFeeVestingWallet(newAddress),
			projectFactory.setCreationFee(newCreationFee),
			projectFactory.setTokenFee(newTokenFee),
			projectFactory.setRouter(newAddress),
			projectFactory.setPairToken(newAddress),
			projectFactory.setTokenFactory(newAddress),
			projectFactory.setCrowdsaleFactory(newAddress),
			projectFactory.setVestingWalletFactory(newAddress),
		]

		await Promise.all(deploys)

		const [
			wallet,
			feeVestingWallet,
			creationFee,
			tokenFee,
			router,
			pairToken,
			tokenFactory,
			crowdsaleFactory,
			vestingWalletFactory,
		] = await Promise.all([
			projectFactory.wallet(),
			projectFactory.feeVestingWallet(),
			projectFactory.creationFee(),
			projectFactory.tokenFee(),
			projectFactory.router(),
			projectFactory.pairToken(),
			projectFactory.tokenFactory(),
			projectFactory.crowdsaleFactory(),
			projectFactory.vestingWalletFactory(),
		])

		expect(wallet).to.equal(newAddress)
		expect(feeVestingWallet).to.equal(newAddress)
		expect(creationFee).to.equal(newCreationFee)
		expect(tokenFee).to.equal(newTokenFee)
		expect(router).to.equal(newAddress)
		expect(pairToken).to.equal(newAddress)
		expect(tokenFactory).to.equal(newAddress)
		expect(crowdsaleFactory).to.equal(newAddress)
		expect(vestingWalletFactory).to.equal(newAddress)
	})

	it('Should revert setting contract variables from a non-owner wallet', async function () {
		const newAddress = signers[1].address
		const deploys = [
			projectFactory.connect(signers[1]).setWallet(newAddress),
			projectFactory.connect(signers[1]).setFeeVestingWallet(newAddress),
			projectFactory.connect(signers[1]).setCreationFee(0),
			projectFactory.connect(signers[1]).setTokenFee(0),
			projectFactory.connect(signers[1]).setRouter(newAddress),
			projectFactory.connect(signers[1]).setPairToken(newAddress),
			projectFactory.connect(signers[1]).setTokenFactory(newAddress),
			projectFactory.connect(signers[1]).setCrowdsaleFactory(newAddress),
			projectFactory
				.connect(signers[1])
				.setVestingWalletFactory(newAddress),
		]

		await Promise.all(
			deploys.map((d) =>
				expectRevert(d, 'Ownable: caller is not the owner'),
			),
		)
	})

	it('Should revert setting contract variables with incorrect parameters', async function () {
		const deploys = [
			{
				fn: projectFactory.setWallet(AddressZero),
				message: 'wallet is the zero address',
			},
			{
				fn: projectFactory.setFeeVestingWallet(AddressZero),
				message: 'address is the zero address',
			},
			{
				fn: projectFactory.setTokenFee(10001),
				message: 'token fee greater than 10000',
			},
			{
				fn: projectFactory.setRouter(AddressZero),
				message: 'router is the zero address',
			},
			{
				fn: projectFactory.setPairToken(AddressZero),
				message: 'pair token is the zero address',
			},
			{
				fn: projectFactory.setTokenFactory(AddressZero),
				message: 'address is the zero address',
			},
			{
				fn: projectFactory.setCrowdsaleFactory(AddressZero),
				message: 'address is the zero address',
			},
			{
				fn: projectFactory.setVestingWalletFactory(AddressZero),
				message: 'address is the zero address',
			},
		]

		await Promise.all(
			deploys.map(({ fn, message }) => expectRevert(fn, message)),
		)
	})

	context('createProject', function () {
		let token: Token
		let crowdsale: Crowdsale
		let vestingWallet: VestingWallet

		let tokenAddr: string
		let crowdsaleAddr: string
		let vestingWalletAddr: string

		const creator = () => signers[2]
		const sentCreationFee = creationFee.add(creationFee.div(4))

		const defaultInput = {
			tokenName: 'My Custom Token',
			tokenSymbol: 'MYCT',
			tokenTotalSupply: 1000,
			tokenLockStartIn: 5500,
			tokenLockDuration: 7500,
			crowdsaleRate: 4,
			crowdsaleCap: 400,
			crowdsaleIndividualCap: 400,
			crowdsaleMinPurchaseAmount: 1,
			crowdsaleGoal: 300,
			crowdsaleOpeningTime: 0,
			crowdsaleClosingTime: 0,
			liquidityRate: 3,
			liquidityLockStartIn: 4750,
			liquidityLockDuration: 9000,
			liquidityPercentage: 57,
		}

		const inputArgs = async ({
			tokenName = defaultInput.tokenName,
			tokenSymbol = defaultInput.tokenSymbol,
			tokenTotalSupply = defaultInput.tokenTotalSupply,
			tokenLockStartIn = defaultInput.tokenLockStartIn,
			tokenLockDuration = defaultInput.tokenLockDuration,
			crowdsaleRate = defaultInput.crowdsaleRate,
			crowdsaleCap = defaultInput.crowdsaleCap,
			crowdsaleIndividualCap = defaultInput.crowdsaleIndividualCap,
			crowdsaleMinPurchaseAmount = defaultInput.crowdsaleMinPurchaseAmount,
			crowdsaleGoal = defaultInput.crowdsaleGoal,
			crowdsaleOpeningTime = 0,
			crowdsaleClosingTime = 0,
			liquidityRate = defaultInput.liquidityRate,
			liquidityLockStartIn = defaultInput.liquidityLockStartIn,
			liquidityLockDuration = defaultInput.liquidityLockDuration,
			liquidityPercentage = defaultInput.liquidityPercentage,
		} = {}) => {
			const time = await getTime()
			crowdsaleOpeningTime ||= time + 4500
			crowdsaleClosingTime ||= crowdsaleOpeningTime + 10_500
			return {
				tokenName,
				tokenSymbol,
				tokenTotalSupply,
				tokenLockStartIn,
				tokenLockDuration,
				crowdsaleRate,
				crowdsaleCap,
				crowdsaleIndividualCap,
				crowdsaleMinPurchaseAmount,
				crowdsaleGoal,
				crowdsaleOpeningTime,
				crowdsaleClosingTime,
				liquidityRate,
				liquidityLockStartIn,
				liquidityLockDuration,
				liquidityPercentage,
			}
		}

		it('Should create project with correct parameters', async function () {
			const input = await inputArgs()
			defaultInput.crowdsaleOpeningTime = input.crowdsaleOpeningTime
			defaultInput.crowdsaleClosingTime = input.crowdsaleClosingTime

			const tx = await projectFactory
				.connect(creator())
				.createProject(input, { value: sentCreationFee })
			const receipt = await tx.wait()

			const event = receipt.events?.find(
				(ev) => ev.event === 'ProjectCreated',
			)
			const [expectedCreator, token, crowdsale, vestingWallet] =
				event?.args || []

			tokenAddr = token
			crowdsaleAddr = crowdsale
			vestingWalletAddr = vestingWallet

			expect(expectedCreator).to.equal(creator().address)
		})

		it('Should create token with correct parameters', async function () {
			token = (await getContractAt('Token', tokenAddr)) as Token

			const [_name, _symbol, _totalSupply] = await Promise.all([
				token.name(),
				token.symbol(),
				token.totalSupply(),
			])

			expect(_name).to.equal(defaultInput.tokenName)
			expect(_symbol).to.equal(defaultInput.tokenSymbol)
			expect(_totalSupply).to.equal(defaultInput.tokenTotalSupply)
		})

		it('Should create crowdsale with correct parameters', async function () {
			crowdsale = (await getContractAt(
				'Crowdsale',
				crowdsaleAddr,
			)) as Crowdsale

			const [
				_token,
				_pairToken,
				_rate,
				_cap,
				_individualCap,
				_minPurchaseAmount,
				_goal,
				_openingTime,
				_closingTime,
			] = await Promise.all([
				crowdsale.token(),
				crowdsale.pairToken(),
				crowdsale.rate(),
				crowdsale.cap(),
				crowdsale.individualCap(),
				crowdsale.minPurchaseAmount(),
				crowdsale.goal(),
				crowdsale.openingTime(),
				crowdsale.closingTime(),
			])

			expect(_token).to.equal(tokenAddr)
			expect(_pairToken).to.equal(pairToken.address)
			expect(_rate).to.equal(defaultInput.crowdsaleRate)
			expect(_cap).to.equal(defaultInput.crowdsaleCap)
			expect(_individualCap).to.equal(defaultInput.crowdsaleIndividualCap)
			expect(_minPurchaseAmount).to.equal(
				defaultInput.crowdsaleMinPurchaseAmount,
			)
			expect(_goal).to.equal(defaultInput.crowdsaleGoal)
			expect(_openingTime).to.equal(defaultInput.crowdsaleOpeningTime)
			expect(_closingTime).to.equal(defaultInput.crowdsaleClosingTime)
		})

		it('Should create vesting wallet with correct parameters', async function () {
			vestingWallet = (await getContractAt(
				'VestingWallet',
				vestingWalletAddr,
			)) as VestingWallet

			const beneficiary = await vestingWallet.beneficiary()
			expect(beneficiary).to.equal(creator().address)
		})

		it('Should transfer msg.value to fee wallet', async function () {
			const wallet = await projectFactory.wallet()
			const balance = await projectFactory.provider.getBalance(wallet)
			expect(balance).to.equal(sentCreationFee)
		})

		it('Should distribute generated tokens correctly', async function () {
			const {
				tokenTotalSupply,
				crowdsaleRate,
				crowdsaleCap,
				liquidityPercentage,
				liquidityRate,
			} = defaultInput

			const tokenFeeAmount = Math.floor(
				(tokenTotalSupply * tokenFee) / 10000,
			)
			const maxLiquidityPairTokenAmount = Math.floor(
				(Math.floor(crowdsaleCap / crowdsaleRate) *
					liquidityPercentage) /
					100,
			)
			const maxLiquidityTokenAmount =
				maxLiquidityPairTokenAmount * liquidityRate
			const requiredTokenAmount =
				tokenFeeAmount + crowdsaleCap + maxLiquidityTokenAmount
			const vestedAmount = tokenTotalSupply - requiredTokenAmount

			const [
				projectFactoryBalance,
				feeVestingWalletBalance,
				crowdsaleBalance,
				vestingWalletBalance,
			] = await Promise.all([
				token.balanceOf(projectFactory.address),
				token.balanceOf(astranoVestingWallet.address),
				token.balanceOf(crowdsaleAddr),
				token.balanceOf(vestingWalletAddr),
			])

			expect(projectFactoryBalance).to.equal(maxLiquidityTokenAmount)
			expect(feeVestingWalletBalance).to.equal(tokenFeeAmount)
			expect(crowdsaleBalance).to.equal(crowdsaleCap)
			expect(vestingWalletBalance).to.equal(vestedAmount)
		})

		it('Should revert create project with incorrect parameters', async function () {
			const deploys = [
				{
					args: { liquidityRate: 0 },
					message: 'liquidityRate is 0',
				},
				{
					args: { liquidityPercentage: 101 },
					message: 'liquidityPercentage > 100',
				},
				{
					args: { liquidityLockStartIn: 0 },
					message: 'liquidityLockStartIn is 0',
				},
				{
					args: { liquidityLockDuration: 0 },
					message: 'liquidityLockDuration is 0',
				},
			]

			await Promise.all(
				deploys.map(async ({ args, message }) =>
					expectRevert(
						projectFactory.createProject(await inputArgs(args), {
							value: creationFee,
						}),
						message,
					),
				),
			)
		})

		it('Should revert create project with insufficient creation fee', async function () {
			await expectRevert(
				projectFactory.createProject(defaultInput, {
					value: creationFee.sub(1),
				}),
				'insufficient funds sent',
			)
		})

		it('Should revert create project with insufficient token supply', async function () {
			// maxLiquidityTokenAmount = 100
			const input = await inputArgs({
				crowdsaleCap: 100,
				crowdsaleRate: 1,
				liquidityPercentage: 100,
				liquidityRate: 1,
				tokenTotalSupply: 200,
			})
			await expectRevert(
				projectFactory.createProject(input, { value: creationFee }),
				'insufficient token supply',
			)
		})

		it('Should get correct project data', async function () {
			const project = await projectFactory.project(tokenAddr)
			const [
				_creator,
				_pairToken,
				_crowdsale,
				_vestingWallet,
				_tokenLockStartIn,
				_tokenLockDuration,
				_crowdsaleRate,
				_crowdsaleCap,
				_crowdsaleGoal,
				_liquidityRate,
				_liquidityLockStartIn,
				_liquidityLockDuration,
				_liquidityPercentage,
				_finalized,
			] = project

			expect(_creator).to.equal(creator().address)
			expect(_pairToken).to.equal(pairToken.address)
			expect(_crowdsale).to.equal(crowdsaleAddr)
			expect(_vestingWallet).to.equal(vestingWalletAddr)
			expect(_tokenLockStartIn).to.equal(defaultInput.tokenLockStartIn)
			expect(_tokenLockDuration).to.equal(defaultInput.tokenLockDuration)
			expect(_crowdsaleRate).to.equal(defaultInput.crowdsaleRate)
			expect(_crowdsaleCap).to.equal(defaultInput.crowdsaleCap)
			expect(_crowdsaleGoal).to.equal(defaultInput.crowdsaleGoal)
			expect(_liquidityRate).to.equal(defaultInput.liquidityRate)
			expect(_liquidityLockStartIn).to.equal(
				defaultInput.liquidityLockStartIn,
			)
			expect(_liquidityLockDuration).to.equal(
				defaultInput.liquidityLockDuration,
			)
			expect(_liquidityPercentage).to.equal(
				defaultInput.liquidityPercentage,
			)
			expect(_finalized).to.be.false
		})
	})

	context('finalizeProject', function () {
		let token: Token
		let pairToken: Token
		let crowdsale: Crowdsale
		let vestingWallet: VestingWallet

		const getProjectFinalizedArgs = async (tx: ContractTransaction) => {
			const receipt = await tx.wait()
			const event = receipt.events?.find(
				(ev) => ev.event === 'ProjectFinalized',
			)
			if (!event?.args)
				throw new Error("Event 'ProjectFinalized' not found")

			const [
				token,
				pairTokenAmount,
				liquidityPair,
				liquidityAmount,
				remainingTokenAmount,
				remainingPairTokenAmount,
			] = event.args as [
				string,
				BigNumber,
				string,
				BigNumber,
				BigNumber,
				BigNumber,
			]
			return {
				token,
				pairTokenAmount,
				liquidityPair,
				liquidityAmount,
				remainingTokenAmount,
				remainingPairTokenAmount,
			}
		}

		const projectInput = {
			tokenName: 'My Custom Token',
			tokenSymbol: 'MYCT',
			tokenTotalSupply: ethers.utils.parseEther('1000'),
			tokenLockStartIn: 5500,
			tokenLockDuration: 7500,
			crowdsaleRate: 4,
			crowdsaleCap: ethers.utils.parseEther('400'),
			crowdsaleIndividualCap: ethers.utils.parseEther('400'),
			crowdsaleMinPurchaseAmount: 1,
			crowdsaleGoal: ethers.utils.parseEther('300'),
			crowdsaleOpeningTime: 0,
			crowdsaleClosingTime: 0,
			liquidityRate: 3,
			liquidityLockStartIn: 4750,
			liquidityLockDuration: 9000,
			liquidityPercentage: 57,
		}

		beforeEach(async function () {
			const time = await getTime()
			projectInput.crowdsaleOpeningTime = time + 4500
			projectInput.crowdsaleClosingTime = time + 10_500

			const tx = await projectFactory.createProject(projectInput, {
				value: creationFee,
			})
			const receipt = await tx.wait()
			const event = receipt.events?.find(
				(ev) => ev.event === 'ProjectCreated',
			)
			const [, tokenAddr, crowdsaleAddr, vestingWalletAddr] =
				event?.args || []

			token = (await getContractAt('Token', tokenAddr)) as Token

			const pairTokenAddr = await projectFactory.pairToken()
			pairToken = (await getContractAt('Token', pairTokenAddr)) as Token

			crowdsale = (await getContractAt(
				'Crowdsale',
				crowdsaleAddr,
			)) as Crowdsale

			vestingWallet = (await getContractAt(
				'VestingWallet',
				vestingWalletAddr,
			)) as VestingWallet

			await setTime(projectInput.crowdsaleOpeningTime)
		})

		it('Should finalize project with correct parameters', async function () {
			const { crowdsaleGoal, crowdsaleRate, crowdsaleClosingTime } =
				projectInput

			const amount = crowdsaleGoal.div(crowdsaleRate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await setTime(crowdsaleClosingTime)
			await projectFactory.finalizeProject(token.address)

			const [tokenBalance, pairTokenBalance] = await Promise.all([
				token.balanceOf(projectFactory.address),
				pairToken.balanceOf(projectFactory.address),
			])
			expect(tokenBalance).to.equal(0)
			expect(pairTokenBalance).to.equal(0)
		})

		it('Should finalize crowdsale when finalizing project', async function () {
			const { crowdsaleCap, crowdsaleRate } = projectInput

			const amount = crowdsaleCap.div(crowdsaleRate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)
			await projectFactory.finalizeProject(token.address)

			const finalized = await crowdsale.finalized()
			expect(finalized).to.be.true
		})

		it('Should calculate correct amount of liquidity tokens when cap reached', async function () {
			const {
				crowdsaleCap,
				crowdsaleRate,
				liquidityPercentage,
				liquidityRate,
			} = projectInput

			const amount = crowdsaleCap.div(crowdsaleRate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)
			const tx = await projectFactory.finalizeProject(token.address)

			const {
				pairTokenAmount,
				remainingTokenAmount,
				remainingPairTokenAmount,
			} = await getProjectFinalizedArgs(tx)

			expect(pairTokenAmount).to.equal(amount)
			const maxLiquidityAmount = crowdsaleCap
				.div(crowdsaleRate)
				.mul(liquidityPercentage)
				.div(100)
			const liquidityAmount = pairTokenAmount.lte(maxLiquidityAmount)
				? pairTokenAmount
				: maxLiquidityAmount
			expect(remainingPairTokenAmount).to.equal(
				pairTokenAmount.sub(liquidityAmount),
			)
			expect(remainingTokenAmount).to.equal(
				crowdsaleCap
					.add(
						maxLiquidityAmount
							.sub(liquidityAmount)
							.mul(liquidityRate),
					)
					.sub(amount.mul(crowdsaleRate)),
			)
		})

		it('Should calculate correct amount of liquidity tokens when goal reached', async function () {
			const {
				crowdsaleCap,
				crowdsaleGoal,
				crowdsaleRate,
				crowdsaleClosingTime,
				liquidityPercentage,
				liquidityRate,
			} = projectInput

			const amount = crowdsaleGoal.div(crowdsaleRate).add(3)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)
			await setTime(crowdsaleClosingTime)

			const tx = await projectFactory.finalizeProject(token.address)
			const {
				pairTokenAmount,
				remainingTokenAmount,
				remainingPairTokenAmount,
			} = await getProjectFinalizedArgs(tx)

			expect(pairTokenAmount).to.equal(amount)
			const maxLiquidityAmount = crowdsaleCap
				.div(crowdsaleRate)
				.mul(liquidityPercentage)
				.div(100)
			const liquidityAmount = pairTokenAmount.lte(maxLiquidityAmount)
				? pairTokenAmount
				: maxLiquidityAmount
			expect(remainingPairTokenAmount).to.equal(
				pairTokenAmount.sub(liquidityAmount),
			)
			expect(remainingTokenAmount).to.equal(
				crowdsaleCap
					.add(
						maxLiquidityAmount
							.sub(liquidityAmount)
							.mul(liquidityRate),
					)
					.sub(amount.mul(crowdsaleRate)),
			)
		})

		it('Should generate liquidity and transfer liquidity tokens to vesting wallet', async function () {
			const { crowdsaleCap, crowdsaleRate } = projectInput

			const amount = crowdsaleCap.div(crowdsaleRate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)
			const tx = await projectFactory.finalizeProject(token.address)
			const { liquidityPair, liquidityAmount } =
				await getProjectFinalizedArgs(tx)

			const pairAddr = await uniswapV2Factory.getPair(
				token.address,
				pairToken.address,
			)

			const pair = (await getContractAt('Token', pairAddr)) as Token
			const pairBalance = await pair.balanceOf(vestingWallet.address)
			expect(pairAddr).to.equal(liquidityPair)
			expect(pairBalance).to.equal(liquidityAmount)
		})

		it('Should transfer remaining tokens to vesting wallet and pair tokens to creator', async function () {
			const {
				tokenTotalSupply,
				crowdsaleCap,
				crowdsaleRate,
				liquidityPercentage,
				liquidityRate,
			} = projectInput

			const amount = crowdsaleCap.div(crowdsaleRate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const beforeCreatorPairTokenBalance = await pairToken.balanceOf(
				signers[0].address,
			)

			const tx = await projectFactory.finalizeProject(token.address)
			const { remainingTokenAmount, remainingPairTokenAmount } =
				await getProjectFinalizedArgs(tx)

			const tokenFeeAmount = tokenTotalSupply.mul(tokenFee).div(10000)
			const maxLiquidityPairTokenAmount = crowdsaleCap
				.div(crowdsaleRate)
				.mul(liquidityPercentage)
				.div(100)
			const maxLiquidityTokenAmount =
				maxLiquidityPairTokenAmount.mul(liquidityRate)
			const requiredTokenAmount = tokenFeeAmount
				.add(crowdsaleCap)
				.add(maxLiquidityTokenAmount)
			const vestedAmount = tokenTotalSupply.sub(requiredTokenAmount)

			const [vestingWalletBalance, afterCreatorPairTokenBalance] =
				await Promise.all([
					token.balanceOf(vestingWallet.address),
					pairToken.balanceOf(signers[0].address),
				])

			expect(vestingWalletBalance).to.equal(
				vestedAmount.add(remainingTokenAmount),
			)
			expect(afterCreatorPairTokenBalance).to.equal(
				beforeCreatorPairTokenBalance.add(remainingPairTokenAmount),
			)
		})

		it('Should delete project data', async function () {
			const { crowdsaleCap, crowdsaleRate } = projectInput

			const amount = crowdsaleCap.div(crowdsaleRate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			const [beforeCreator] = await projectFactory.project(token.address)
			expect(beforeCreator).to.not.equal(AddressZero)

			await projectFactory.finalizeProject(token.address)

			const [afterCreator] = await projectFactory.project(token.address)
			expect(afterCreator).to.equal(AddressZero)
		})

		it('Should revert finalize project if project not found', async function () {
			await expectRevert(
				projectFactory.finalizeProject(AddressZero),
				'project not found',
			)
		})

		it('Should revert finalize project if project already finalized', async function () {
			const { crowdsaleCap, crowdsaleRate } = projectInput

			const amount = crowdsaleCap.div(crowdsaleRate)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)
			await projectFactory.finalizeProject(token.address)

			await expectRevert(
				projectFactory.finalizeProject(token.address),
				'project not found',
			)
		})

		it('Should revert finalize project if crowdsale not finalizable', async function () {
			const { crowdsaleCap, crowdsaleRate } = projectInput

			const amount = crowdsaleCap.div(crowdsaleRate).sub(1)
			await pairToken.approve(crowdsale.address, amount)
			await crowdsale.buy(signers[0].address, amount)

			await expectRevert(
				projectFactory.finalizeProject(token.address),
				'crowdsale not closed',
			)
		})
	})
})
