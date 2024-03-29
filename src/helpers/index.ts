/* eslint-disable node/no-missing-import */
import { ethers } from 'hardhat'

const provider = ethers.provider

type SetTime = (target: number) => Promise<void>

export const getBlock = () => provider.getBlock('latest')

export const getTime = async () => {
	const block = await getBlock()
	return block.timestamp
}

/**
 * @param target move block timestamp to target (unix epoch in seconds)
 */
export const setTime: SetTime = async (target) => {
	const block = await getBlock()
	const now = block.timestamp
	const diff = target - now

	if (diff < 0)
		throw Error(
			`Cannot increase current time (${now}) to a moment in the past (${target})`,
		)

	await provider.send('evm_mine', [target])
}

export { default as expectRevert } from './expectRevert'
