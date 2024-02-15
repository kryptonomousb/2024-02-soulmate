// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {BaseTest} from "./BaseTest.t.sol";
import {Soulmate} from "../../src/Soulmate.sol";
import {console} from "forge-std/Test.sol";
import {console} from "forge-std/Test.sol";

contract AirdropTest is Soulmate, BaseTest {
    function test_WellInitialized() public {
        assertTrue(loveToken.allowance(address(airdropVault), address(airdropContract)) == 500_000_000 ether);
    }

    function test_Claim() public {
        _mintOneTokenForBothSoulmates();

        // Not enough day in relationship
        vm.prank(soulmate1);
        vm.expectRevert();
        airdropContract.claim();

        soulmateContract.getDivorced();
        console.log(soulmateContract.isDivorced());
        vm.warp(block.timestamp + 200 days + 1 seconds);

        vm.prank(soulmate1);
        airdropContract.claim();
        assertTrue(loveToken.balanceOf(soulmate1) == 200 ether);

       // vm.prank(soulmate2);
       // airdropContract.claim();

       // assertTrue(loveToken.balanceOf(soulmate2) == 200 ether);
    }
}
