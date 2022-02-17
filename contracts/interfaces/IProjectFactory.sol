// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IUniswapV2Router02.sol";
import "./IAstranoVestingWallet.sol";

interface IProjectFactory {
    function wallet() external view returns (address);

    function setWallet(address payable wallet_) external;

    function feeVestingWallet() external view returns (IAstranoVestingWallet);

    function setFeeVestingWallet(address feeVestingWalletAddress_) external;

    function creationFee() external view returns (uint256);

    function setCreationFee(uint256 creationFee_) external;

    function tokenFee() external view returns (uint256);

    function setTokenFee(uint256 tokenFee_) external;

    function router() external view returns (IUniswapV2Router02);

    function setRouter(address routerAddress_) external;

    function pairToken() external view returns (IERC20);

    function setPairToken(address pairTokenAddress_) external;

    function createProject(NewProject calldata data_) external payable;

    function finalizeProject(address token_) external;

    struct Project {
        address creator;
        address pairToken;
        address crowdsale;
        address vestingWallet;
        uint64 tokenLockStartIn;
        uint64 tokenLockDuration;
        uint256 crowdsaleRate;
        uint256 crowdsaleGoal;
        uint256 liquidityRate;
        uint64 liquidityLockStartIn;
        uint64 liquidityLockDuration;
        uint8 liquidityPercentage;
        bool finalized;
    }

    struct NewProject {
        string tokenName;
        string tokenSymbol;
        uint256 tokenTotalSupply;
        uint64 tokenLockStartIn;
        uint64 tokenLockDuration;
        uint256 crowdsaleRate;
        uint256 crowdsaleCap;
        uint256 crowdsaleIndividualCap;
        uint256 crowdsaleMinPurchaseAmount;
        uint256 crowdsaleGoal;
        uint64 crowdsaleOpeningTime;
        uint64 crowdsaleClosingTime;
        uint256 liquidityRate;
        uint64 liquidityLockStartIn;
        uint64 liquidityLockDuration;
        uint256 liquidityPercentage; // Variable packing inefficient here
    }
}
