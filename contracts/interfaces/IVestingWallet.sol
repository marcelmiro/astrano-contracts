// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IVestingWallet {
    function beneficiary() external view returns (address);

    function start(address token) external view returns (uint256);

    function duration(address token) external view returns (uint256);

    function released(address token) external view returns (uint256);

    function releasable(address token) external view returns (uint256 amount_, bool finished_);

    function deposit(
        address token,
        uint256 amount,
        uint256 startIn_,
        uint256 duration_
    ) external;

    function release(address token) external;
}
