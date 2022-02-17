// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat'

async function main() {
	// Hardhat always runs the compile task when running scripts with its command
	// line interface.
	//
	// If this script is run directly using `node` you may want to call compile
	// manually to make sure everything is compiled
	// await hre.run('compile');

	const wallet = '0xD3f0Bcdb117C05b988159d7244eC7c19faB0d56f'
	const router = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
	const pairToken = '0xd3CfD9DFd2C6c73e9a51e26781721F72Be3b1325'
	const creationFee = ethers.utils.parseEther('0.1')
	const tokenFee = 100

	const astranoVestingWallet = '0x353962005D642C7daa12D953068D287e99D49743'
	const tokenFactory = '0x9d37Ce811D3BeF2D6694d14c82Ab14BBa6b4a350'
	const crowdsaleFactory = '0xA8b155712a37DAcD82e9216304077462b2f812A2'
	const vestingWalletFactory = '0xe985606Ce15c11EC0a67bFC88a719d4586EfE164'
	const projectFactoryAddr = '0x2C7A45d4Abf809Cd9d344Be38AF56Cf2B2DfA023'

	/* const ProjectFactory = await ethers.getContractFactory('ProjectFactory')
	const projectFactory = ProjectFactory.attach(projectFactoryAddr)
	const newProject = [
		'Hello world',
		'HELLO',
		ethers.utils.parseEther('1200'),
		300,
		300,
		100,
		ethers.utils.parseEther('120'),
		ethers.utils.parseEther('100'),
		ethers.utils.parseEther('0.2'),
		ethers.utils.parseEther('100'),
		Math.ceil(Date.now() / 1000) + 300,
		Math.ceil(Date.now() / 1000) + 600,
		80,
		400,
		500,
		60,
	]
	const tx = await projectFactory.createProject(newProject, {
		value: ethers.utils.parseEther('0.100072'),
	})
	await tx.wait()
	console.log(tx) */
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
