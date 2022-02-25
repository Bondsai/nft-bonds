import {NftBonds} from "../target/types/nft_bonds";
import {Program, Provider} from "@project-serum/anchor";
import * as assert from 'assert';
import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import {NodeWallet} from "@project-serum/anchor/dist/cjs/provider";
import {LAMPORTS_PER_SOL, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";


function programPaidBy(provider: Provider, payer: anchor.web3.Keypair): anchor.Program {
    const program = anchor.workspace.NftBonds as Program<NftBonds>;
    // @ts-ignore
    const newProvider = new anchor.Provider(provider.connection, new anchor.Wallet(payer), {});

    return new anchor.Program(program.idl as anchor.Idl, program.programId, newProvider)
}


describe('nft-bonds', async () => {
    const provider = anchor.Provider.env()

    let offerMaker = anchor.web3.Keypair.generate();
    let offerTaker = anchor.web3.Keypair.generate();
    let payer = anchor.web3.Keypair.generate();

    const program = programPaidBy(provider, offerMaker);

    let offerMakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
    let offerTakerNftTokenAccount: anchor.web3.PublicKey;
    let offerTakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
    let offerMakerNftTokenAccount: anchor.web3.PublicKey;

    let nftMint: spl.Token;
    let platformTokensMint: spl.Token;

    const DURATION_VAL = 5
    const PERCENT_VAL = 20
    const TITLE = "My Event"
    const VESTING_TIME = 0;

    before(async () => {
        const wallet = program.provider.wallet as NodeWallet;

        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL)
        );

        // Fund Main Accounts
        await sendAndConfirmTransaction(
            provider.connection,
            (() => {
                const tx = new Transaction();
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: offerMaker.publicKey,
                        lamports: LAMPORTS_PER_SOL / 10,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: offerTaker.publicKey,
                        lamports: LAMPORTS_PER_SOL / 10,
                    })
                );
                return tx;
            })(),
            [payer]
        );

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
            offerMaker.publicKey
        )

        offerMakerPlatformTokensTokenAccount = await platformTokensMint.createAssociatedTokenAccount(
            offerMaker.publicKey
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

    it('Create event, place offer, accept offer and open event', async () => {
        const [eventAccount, eventAccountBump] = await anchor.web3.PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("event"), offerMaker.publicKey.toBuffer()],
            program.programId
        )
        console.log("User:", offerMaker.publicKey.toString())
        console.log("Event:", eventAccount.toString())

        await program.rpc.createEvent(eventAccountBump, TITLE, DURATION_VAL, PERCENT_VAL, VESTING_TIME, {
            accounts: {
                eventAccount: eventAccount,
                authority: offerMaker.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            }, signers: [offerMaker]
        })

        let eventAccountInfo = await program.account.eventAccount.fetch(eventAccount)
        assert.equal(PERCENT_VAL, eventAccountInfo.percent);
        assert.equal(offerMaker.publicKey.toString(), eventAccountInfo.authority.toString());
        assert.equal(0, eventAccountInfo.totalNfts);
        assert.equal(false, eventAccountInfo.isOpened);

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
                    authority: offerMaker.publicKey,
                    tokenAccountFromWhoMadeTheOffer: offerMakerPlatformTokensTokenAccount,
                    escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
                    kindOfTokenOffered: platformTokensMint.publicKey,
                    kindOfTokenWantedInReturn: nftMint.publicKey,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY
                }, signers: [offerMaker]
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
                    authority: offerMaker.publicKey,
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

        await program.rpc.submitEvent(
            {
                accounts: {
                    eventAccount: eventAccount
                }, signers: [offerMaker]
            }
        );

        eventAccountInfo = await program.account.eventAccount.fetch(eventAccount)
        assert.equal(true, eventAccountInfo.isOpened);


    });
});