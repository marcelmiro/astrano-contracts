// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Factory.sol";

/// @custom:security-contact marcel.miro@astrano.io
contract Token is ERC20/* , Ownable */ {
    // Bool to allow generateLiquidityPool() to only run once
    /* bool private _liquidityPoolGenerated;

    // Address of LP pair token
    address private _pairTokenAddress;

    // Token amount for LP
    uint256 private immutable _lpTokenAmount;

    // Pair token amount for LP
    uint256 private _lpPairTokenAmount; */

    /**
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param totalSupply_ Initial and max supply of the token
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_/* ,
        address pairTokenAddress_,
        uint256 lpTokenAmount_,
        uint256 lpPairTokenAmount_ */
    ) ERC20(name_, symbol_) {
        /* require(totalSupply_ >= lpTokenAmount_, "Token: LP amount is greater than total supply");

        _pairTokenAddress = pairTokenAddress_;
        _lpTokenAmount = lpTokenAmount_;
        _lpPairTokenAmount = lpPairTokenAmount_; */

        _mint(msg.sender, totalSupply_);

        emit Transfer(address(this), msg.sender, totalSupply_);
    }

    /**
     * @return boolean if token's liquidity pool has been generated
     */
    /* function liquidityPoolGenerated() external view returns (bool) {
        return _liquidityPoolGenerated;
    } */

    /**
     * @return address of LP pair token
     */
    /* function pairTokenAddress() external view returns (address) {
        return _pairTokenAddress;
    } */

    /**
     * @return amount of tokens for LP
     */
    /* function lpTokenAmount() external view returns (uint256) {
        return _lpTokenAmount;
    } */

    /**
     * @return amount of pair tokens for LP
     */
    /* function lpPairTokenAmount() external view returns (uint256) {
        return _lpPairTokenAmount;
    } */

    /**
     * @param pairTokenAddress_ Address of pair token for LP
     */
    /* function setPairTokenAddress(address pairTokenAddress_) external onlyOwner {
        _pairTokenAddress = pairTokenAddress_;
    }

    function generateLiquidityPool(address routerAddress_) external onlyOwner {
        require(!_liquidityPoolGenerated, "Token: Liquidity pool already generated");
        _liquidityPoolGenerated = true;

        IUniswapV2Router02 uniswapV2Router = IUniswapV2Router02(routerAddress_);

        uniswapV2Router.addLiquidity(
            address(this),
            _pairTokenAddress,
            _lpTokenAmount,
            _lpPairTokenAmount,
            0,
            0,
            address(this),
            block.timestamp
        );
    } */
}
