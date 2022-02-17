// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IAstranoVestingWallet {
    function beneficiary() external view returns (address);

    function setBeneficiary(address beneficiary_) external;

    function startIn() external view returns (uint256);

    function duration() external view returns (uint256);

    function start(address token) external view returns (uint256);

    function released(address token) external view returns (uint256);

    function releasable(address token) external view returns (uint256, bool);

    function deposit(address token, uint256 amount) external;

    function release(address token) external;
}
