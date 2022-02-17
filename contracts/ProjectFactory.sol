// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IProjectFactory.sol";
import "./interfaces/ITokenFactory.sol";
import "./interfaces/ICrowdsaleFactory.sol";
import "./interfaces/IVestingWalletFactory.sol";
import "./interfaces/IAstranoVestingWallet.sol";
import "./interfaces/IVestingWallet.sol";
import "./interfaces/ICrowdsale.sol";

/**
 * @title ProjectFactory
 * @dev Factory contract that creates and manages projects launched by Astrano
 * @custom:security-contact marcel.miro@astrano.io
 */
contract ProjectFactory is Ownable, IProjectFactory {
    address payable private _wallet;
    IAstranoVestingWallet private _feeVestingWallet;
    uint256 private _creationFee;
    uint256 private _tokenFee;
    IUniswapV2Router02 private _router;
    IERC20 private _pairToken;
    mapping(address => Project) private _projects;
    ITokenFactory private _tokenFactory;
    ICrowdsaleFactory private _crowdsaleFactory;
    IVestingWalletFactory private _vestingWalletFactory;

    event ProjectCreated(
        address creator,
        address indexed token,
        address indexed crowdsale,
        address indexed vestingWallet
    );

    event ProjectFinalized(
        address indexed token,
        uint256 pairTokenAmount,
        address indexed liquidityPair,
        uint256 liquidityAmount,
        uint256 remainingTokenAmount,
        uint256 remainingPairTokenAmount
    );

    constructor(
        address payable wallet_,
        address feeVestingWalletAddress_,
        uint256 creationFee_,
        uint256 tokenFee_,
        address routerAddress_,
        address pairTokenAddress_,
        address tokenFactoryAddress_,
        address crowdsaleFactoryAddress_,
        address vestingWalletFactoryAddress_
    ) {
        require(tokenFee_ <= 10000, "token fee greater than 10000");
        require(wallet_ != address(0), "wallet is the zero address");
        require(feeVestingWalletAddress_ != address(0), "vesting is the zero address");
        require(routerAddress_ != address(0), "router is the zero address");
        require(pairTokenAddress_ != address(0), "pair token is the zero address");
        require(tokenFactoryAddress_ != address(0), "token factory is address(0)");
        require(crowdsaleFactoryAddress_ != address(0), "crowdsale factory is address(0)");
        require(vestingWalletFactoryAddress_ != address(0), "vesting factory is address(0)");

        _wallet = wallet_;
        _feeVestingWallet = IAstranoVestingWallet(feeVestingWalletAddress_);
        _creationFee = creationFee_;
        _tokenFee = tokenFee_;
        _router = IUniswapV2Router02(routerAddress_);
        _pairToken = IERC20(pairTokenAddress_);
        _tokenFactory = ITokenFactory(tokenFactoryAddress_);
        _crowdsaleFactory = ICrowdsaleFactory(crowdsaleFactoryAddress_);
        _vestingWalletFactory = IVestingWalletFactory(vestingWalletFactoryAddress_);
    }

    /**
     * @return address to send fees to
     */
    function wallet() external view returns (address) {
        return _wallet;
    }

    /**
     * @param wallet_ address to send fees to
     */
    function setWallet(address payable wallet_) external onlyOwner {
        require(wallet_ != address(0), "wallet is the zero address");
        _wallet = wallet_;
    }

    /**
     * @return address to send token fees to
     */
    function feeVestingWallet() external view returns (IAstranoVestingWallet) {
        return _feeVestingWallet;
    }

    /**
     * @param feeVestingWalletAddress_ address to send token fees to
     */
    function setFeeVestingWallet(address feeVestingWalletAddress_) external onlyOwner {
        require(feeVestingWalletAddress_ != address(0), "address is the zero address");
        _feeVestingWallet = IAstranoVestingWallet(feeVestingWalletAddress_);
    }

    /**
     * @return fee to create projects
     */
    function creationFee() external view returns (uint256) {
        return _creationFee;
    }

    /**
     * @param creationFee_ fee to create projects
     */
    function setCreationFee(uint256 creationFee_) external onlyOwner {
        _creationFee = creationFee_;
    }

    /**
     * @return percentage fee to subtract from token supply (0 - 10000)
     */
    function tokenFee() external view returns (uint256) {
        return _tokenFee;
    }

    /**
     * @param tokenFee_ percentage fee to subtract from token supply (0 - 10000)
     */
    function setTokenFee(uint256 tokenFee_) external onlyOwner {
        require(tokenFee_ <= 10000, "token fee greater than 10000");
        _tokenFee = tokenFee_;
    }

    /**
     * @return router address
     */
    function router() external view returns (IUniswapV2Router02) {
        return _router;
    }

    /**
     * @param routerAddress_ uniswap router address
     */
    function setRouter(address routerAddress_) external onlyOwner {
        require(routerAddress_ != address(0), "router is the zero address");
        _router = IUniswapV2Router02(routerAddress_);
    }

    /**
     * @return pair token address
     */
    function pairToken() external view returns (IERC20) {
        return _pairToken;
    }

    /**
     * @param pairTokenAddress_ pair token address
     */
    function setPairToken(address pairTokenAddress_) external onlyOwner {
        require(pairTokenAddress_ != address(0), "pair token is the zero address");
        _pairToken = IERC20(pairTokenAddress_);
    }

    /**
     * @return token factory address
     */
    function tokenFactory() external view returns (ITokenFactory) {
        return _tokenFactory;
    }

    /**
     * @param tokenFactoryAddress_ token factory address
     */
    function setTokenFactory(address tokenFactoryAddress_) external onlyOwner {
        require(tokenFactoryAddress_ != address(0), "address is the zero address");
        _tokenFactory = ITokenFactory(tokenFactoryAddress_);
    }

    /**
     * @return crowdsale factory address
     */
    function crowdsaleFactory() external view returns (ICrowdsaleFactory) {
        return _crowdsaleFactory;
    }

    /**
     * @param crowdsaleFactoryAddress_ crowdsale factory address
     */
    function setCrowdsaleFactory(address crowdsaleFactoryAddress_) external onlyOwner {
        require(crowdsaleFactoryAddress_ != address(0), "address is the zero address");
        _crowdsaleFactory = ICrowdsaleFactory(crowdsaleFactoryAddress_);
    }

    /**
     * @return vesting wallet factory address
     */
    function vestingWalletFactory() external view returns (IVestingWalletFactory) {
        return _vestingWalletFactory;
    }

    /**
     * @param vestingWalletFactoryAddress_ vesting wallet factory address
     */
    function setVestingWalletFactory(address vestingWalletFactoryAddress_) external onlyOwner {
        require(vestingWalletFactoryAddress_ != address(0), "address is the zero address");
        _vestingWalletFactory = IVestingWalletFactory(vestingWalletFactoryAddress_);
    }

    /**
     * @dev Create new project
     */
    function createProject(NewProject calldata data_) external payable {
        require(msg.value >= _creationFee, "insufficient funds sent");

        // Validate liquidity parameters as these are checked only when finalizing the project
        require(data_.liquidityPercentage <= 100, "liquidityPercentage > 100");
        require(data_.liquidityLockStartIn > 0, "liquidityLockStartIn is 0");

        uint256 tokenFeeAmount = (data_.tokenTotalSupply * _tokenFee) / 10000;

        // Validate minimum token total supply required
        uint256 maxLiquidityPairTokenAmount = ((data_.crowdsaleCap / data_.crowdsaleRate) * data_.liquidityPercentage) /
            100;
        uint256 maxLiquidityTokenAmount = maxLiquidityPairTokenAmount * data_.liquidityRate;
        uint256 requiredTotalSupply = tokenFeeAmount + data_.crowdsaleCap + maxLiquidityTokenAmount;
        require(data_.tokenTotalSupply >= requiredTotalSupply, "insufficient token supply");

        // Create contracts
        address token = _tokenFactory.createToken(data_.tokenName, data_.tokenSymbol, data_.tokenTotalSupply);

        address crowdsale = _crowdsaleFactory.createCrowdsale(
            ICrowdsaleFactory.Input(
                token,
                address(_pairToken),
                msg.sender,
                address(this),
                data_.crowdsaleRate,
                data_.crowdsaleCap,
                data_.crowdsaleIndividualCap,
                data_.crowdsaleMinPurchaseAmount,
                data_.crowdsaleGoal,
                data_.crowdsaleOpeningTime,
                data_.crowdsaleClosingTime
            )
        );

        address vestingWallet = _vestingWalletFactory.createVestingWallet(msg.sender);

        // Store project data
        Project memory project;
        project.creator = msg.sender;
        project.pairToken = address(_pairToken);
        project.crowdsale = crowdsale;
        project.vestingWallet = vestingWallet;
        project.tokenLockStartIn = data_.tokenLockStartIn;
        project.tokenLockDuration = data_.tokenLockDuration;
        project.crowdsaleRate = data_.crowdsaleRate;
        project.crowdsaleGoal = data_.crowdsaleGoal;
        project.liquidityRate = data_.liquidityRate;
        project.liquidityLockStartIn = uint64(data_.liquidityLockStartIn);
        project.liquidityLockDuration = uint64(data_.liquidityLockDuration);
        project.liquidityPercentage = uint8(data_.liquidityPercentage);
        _projects[token] = project;

        // Vest remaining tokens
        uint256 vestingTokenAmount = data_.tokenTotalSupply - requiredTotalSupply;
        if (vestingTokenAmount > 0) {
            IERC20(token).approve(vestingWallet, vestingTokenAmount);
            IVestingWallet(vestingWallet).deposit(
                token,
                vestingTokenAmount,
                data_.tokenLockStartIn,
                data_.tokenLockDuration
            );
        }

        // Send token fee to Astrano's vesting wallet
        IERC20(token).approve(address(_feeVestingWallet), tokenFeeAmount);
        _feeVestingWallet.deposit(token, tokenFeeAmount);

        // Send tokens to sell in crowdsale
        IERC20(token).transfer(crowdsale, data_.crowdsaleCap);

        _wallet.transfer(msg.value);

        emit ProjectCreated(msg.sender, token, crowdsale, vestingWallet);
    }

    /**
     * @dev Finalize a project
     */
    function finalizeProject(address token_) external {
        Project memory project = _projects[token_];

        _preValidateFinalizeProject(project);

        project.finalized = true;

        // Crowdsale will give `pairTokenAmount` as the allowance of this contract (spender) for the project's pair token
        uint256 pairTokenAmount = ICrowdsale(project.crowdsale).finalize();

        // Calculate liquidity token amounts
        require(pairTokenAmount * project.crowdsaleRate >= project.crowdsaleGoal, "insuf pair token allowance");
        SafeERC20.safeTransferFrom(IERC20(project.pairToken), project.crowdsale, address(this), pairTokenAmount);
        uint256 liquidityPairTokenAmount = (pairTokenAmount * project.liquidityPercentage) / 100;
        uint256 liquidityTokenAmount = liquidityPairTokenAmount * project.liquidityRate;
        uint256 tokenBalance = IERC20(token_).balanceOf(address(this));
        require(tokenBalance >= liquidityTokenAmount, "insuf token balance");

        (address liquidityPair, uint256 liquidityAmount) = _generateLiquidity(
            token_,
            project.pairToken,
            liquidityTokenAmount,
            liquidityPairTokenAmount,
            project.vestingWallet,
            project.liquidityLockStartIn,
            project.liquidityLockDuration
        );

        // Vest remaining pair tokens
        uint256 remainingPairTokenAmount = pairTokenAmount - liquidityPairTokenAmount;
        if (remainingPairTokenAmount > 0) {
            IERC20(project.pairToken).transfer(project.creator, remainingPairTokenAmount);
        }

        // Vest remaining tokens
        uint256 remainingTokenAmount = tokenBalance - liquidityTokenAmount;
        if (remainingTokenAmount > 0) {
            IERC20(token_).approve(project.vestingWallet, remainingTokenAmount);
            IVestingWallet(project.vestingWallet).deposit(
                token_,
                remainingTokenAmount,
                project.tokenLockStartIn,
                project.tokenLockDuration
            );
        }

        delete project; // FIXME: Will this work?

        emit ProjectFinalized(
            token_,
            pairTokenAmount,
            liquidityPair,
            liquidityAmount,
            remainingTokenAmount,
            remainingPairTokenAmount
        );
    }

    function _preValidateFinalizeProject(Project memory project) private pure {
        require(project.pairToken != address(0), "project not found");
        require(!project.finalized, "project already finalized");
    }

    function _generateLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address vestingWallet,
        uint64 liquidityLockStartIn,
        uint64 liquidityLockDuration
    ) private returns (address liquidityPair, uint256 liquidityAmount) {
        IUniswapV2Pair uniswapV2Pair = IUniswapV2Pair(IUniswapV2Factory(_router.factory()).createPair(tokenA, tokenB));

        IERC20(tokenA).approve(address(_router), amountA);
        IERC20(tokenB).approve(address(_router), amountB);

        (, , uint256 amountLiquidity) = _router.addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            0,
            0,
            address(this),
            type(uint64).max
        );

        // Vest liquidity tokens
        uniswapV2Pair.approve(vestingWallet, amountLiquidity);
        IVestingWallet(vestingWallet).deposit(
            address(uniswapV2Pair),
            amountLiquidity,
            liquidityLockStartIn,
            liquidityLockDuration
        );

        return (address(uniswapV2Pair), amountLiquidity);
    }
}
