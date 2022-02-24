import { NftBonds } from "../target/types/nft-bonds";
import { Program } from "@project-serum/anchor";
import * as assert from 'assert';
import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { NodeWallet } from "@project-serum/anchor/dist/cjs/provider";


describe('nft-bonds', () => {

  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.NftBonds as Program<NftBonds>;

  let offerMakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
  let offerTakerNftTokenAccount: anchor.web3.PublicKey;
  let offerTakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
  let offerMakerNftTokenAccount: anchor.web3.PublicKey;

  let nftMint: spl.Token;
  let platformTokensMint: spl.Token;

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

  it('It let you place and accept offers for tokens', async () => {

    const offer = anchor.web3.Keypair.generate();
    console.log(offer.publicKey.toBase58())
    const [escrowedTokensOfOfferMaker, escrowedTokensOfOfferMakerBump] = await anchor.web3.PublicKey.findProgramAddress(
      [offer.publicKey.toBuffer()],
      program.programId
    )

    await program.rpc.makeOffer(
      escrowedTokensOfOfferMakerBump,
      new anchor.BN(43),
      {
        accounts: {
          offer: offer.publicKey,
          whoMadeTheOffer: program.provider.wallet.publicKey,
          tokenAccountFromWhoMadeTheOffer: offerMakerPlatformTokensTokenAccount,
          escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
          kindOfTokenOffered: platformTokensMint.publicKey,
          kindOfTokenWantedInReturn: nftMint.publicKey,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY
        },
        signers: [offer]
      }
    );

    assert.equal(43, (await platformTokensMint.getAccountInfo(escrowedTokensOfOfferMaker)).amount.toNumber());
    assert.equal(57, (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber());
    const offerMakerCurrentNftAmounts = (await nftMint.getAccountInfo(offerMakerNftTokenAccount)).amount.toNumber();
    const offerMakerCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber();
    console.log(offerMakerCurrentPlatformTokensAmounts)
    const offerReceiverCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerTakerPlatformTokensTokenAccount)).amount.toNumber();

    let tx = await program.rpc.acceptOffer(
      {
        accounts: {
          offer: offer.publicKey,
          whoMadeTheOffer: program.provider.wallet.publicKey,
          whoIsTakingTheOffer: offerTaker.publicKey,
          escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
          accountHoldingWhatMakerWillGet: offerMakerNftTokenAccount, // account where the wanted pigs will be sent
          accountHoldingWhatReceiverWillGive: offerTakerNftTokenAccount,
          accountHoldingWhatReceiverWillGet: offerTakerPlatformTokensTokenAccount, // where I'm getting my cows to
          kindOfTokenWantedInReturn: nftMint.publicKey, //
          tokenProgram: spl.TOKEN_PROGRAM_ID,
        },
        signers: [offerTaker]
      }
    );

    console.log(tx);

    assert.equal(offerMakerCurrentPlatformTokensAmounts, (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber());
    assert.equal(offerReceiverCurrentPlatformTokensAmounts + 43, (await platformTokensMint.getAccountInfo(offerTakerPlatformTokensTokenAccount)).amount.toNumber());

    // accounts closed after transactions completed (e.g, accepted).
    // assert.equal(null, await program.provider.connection.getAccountInfo(offer.publicKey));
    // assert.equal(null, await program.provider.connection.getAccountInfo(escrowedTokensOfOfferMaker));

  });
});