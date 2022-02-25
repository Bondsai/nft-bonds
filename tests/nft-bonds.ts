import {NftBonds} from "../target/types/nft_bonds";
import {Program} from "@project-serum/anchor";
import * as assert from 'assert';
import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import {NodeWallet} from "@project-serum/anchor/dist/cjs/provider";


describe('nft-bonds', () => {

    anchor.setProvider(anchor.Provider.env());
    const program = anchor.workspace.NftBonds as Program<NftBonds>;

    let offerMakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
    let offerTakerNftTokenAccount: anchor.web3.PublicKey;
    let offerTakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
    let offerMakerNftTokenAccount: anchor.web3.PublicKey;

    let nftMint: spl.Token;
    let platformTokensMint: spl.Token;

    const DURATION_VAL = 5
    const PERCENT_VAL = 20

    let offerTaker = anchor.web3.Keypair.generate();

    before(async () => {
        const wallet = program.provider.wallet as NodeWallet;

        nftMint = await spl.Token.createMint(program.provider.connection,
            wallet.payer,
            wallet.publicKey,
            wallet.publicKey,
            0,
            spl.TOKEN_PROGRAM_ID);

        platformTokensMint = await spl.Token.createMint(program.provider.connection,
            wallet.payer,
            wallet.publicKey,
            wallet.publicKey,
            100,
            spl.TOKEN_PROGRAM_ID);


        offerMakerNftTokenAccount = await nftMint.createAssociatedTokenAccount(
            program.provider.wallet.publicKey
        )

        offerMakerPlatformTokensTokenAccount = await platformTokensMint.createAssociatedTokenAccount(
            program.provider.wallet.publicKey
        )

        offerTakerNftTokenAccount = await nftMint.createAssociatedTokenAccount(
            offerTaker.publicKey
        )

        offerTakerPlatformTokensTokenAccount = await platformTokensMint.createAssociatedTokenAccount(
            offerTaker.publicKey
        )

        await nftMint.mintTo(offerTakerNftTokenAccount, program.provider.wallet.publicKey, [], 1);
        await platformTokensMint.mintTo(offerMakerPlatformTokensTokenAccount, program.provider.wallet.publicKey, [], 100);

    });

    it('Create event, place offer, accept offer', async () => {
        const [eventAccount, eventAccountBump] = await anchor.web3.PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("event"), anchor.getProvider().wallet.publicKey.toBuffer()],
            program.programId
        )
        console.log("User:", anchor.getProvider().wallet.publicKey.toString())
        console.log("Event:", eventAccount.toString())

        await program.rpc.createEvent(eventAccountBump, DURATION_VAL, PERCENT_VAL, {
            accounts: {
                eventAccount: eventAccount,
                authority: anchor.getProvider().wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        })
        let eventAccountInfo = await program.account.eventAccount.fetch(eventAccount)
        assert.equal(PERCENT_VAL, eventAccountInfo.percent);
        assert.equal(anchor.getProvider().wallet.publicKey.toString(), eventAccountInfo.authority.toString());
        assert.equal(0, eventAccountInfo.totalNfts);

        const [offer, offerBump] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("offer"),
                eventAccount.toBuffer(),
                new anchor.BN(0).toArrayLike(Buffer)
            ],
            program.programId
        )

        const [escrowedTokensOfOfferMaker, escrowedTokensOfOfferMakerBump] = await anchor.web3.PublicKey.findProgramAddress(
            [offer.toBuffer()],
            program.programId
        )

        await program.rpc.makeOffer(
            offerBump,
            escrowedTokensOfOfferMakerBump,
            new anchor.BN(43),
            {
                accounts: {
                    eventAccount: eventAccount,
                    offer: offer,
                    authority: program.provider.wallet.publicKey,
                    tokenAccountFromWhoMadeTheOffer: offerMakerPlatformTokensTokenAccount,
                    escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
                    kindOfTokenOffered: platformTokensMint.publicKey,
                    kindOfTokenWantedInReturn: nftMint.publicKey,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY
                }
            }
        );

        assert.equal(43, (await platformTokensMint.getAccountInfo(escrowedTokensOfOfferMaker)).amount.toNumber());
        assert.equal(57, (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber());
        const offerMakerCurrentNftAmounts = (await nftMint.getAccountInfo(offerMakerNftTokenAccount)).amount.toNumber();
        const offerMakerCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber();
        const offerReceiverCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerTakerPlatformTokensTokenAccount)).amount.toNumber();

        let tx = await program.rpc.acceptOffer(
            {
                accounts: {
                    eventAccount: eventAccount,
                    offer: offer,
                    authority: program.provider.wallet.publicKey,
                    whoIsTakingTheOffer: offerTaker.publicKey,
                    escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
                    accountHoldingWhatMakerWillGet: offerMakerNftTokenAccount,
                    accountHoldingWhatReceiverWillGive: offerTakerNftTokenAccount,
                    accountHoldingWhatReceiverWillGet: offerTakerPlatformTokensTokenAccount,
                    kindOfTokenWantedInReturn: nftMint.publicKey,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                },
                signers: [offerTaker]
            }
        );

        console.log(tx);

        assert.equal(offerMakerCurrentPlatformTokensAmounts, (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber());
        assert.equal(offerReceiverCurrentPlatformTokensAmounts + 43, (await platformTokensMint.getAccountInfo(offerTakerPlatformTokensTokenAccount)).amount.toNumber());

    });
});