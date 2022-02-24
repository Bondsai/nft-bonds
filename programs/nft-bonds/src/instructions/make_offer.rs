use anchor_lang::prelude::*;
use anchor_lang::solana_program;

use crate::state::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(escrow_bump: u8)]
pub struct MakeOffer<'info> {
    #[account(init, payer = who_made_the_offer, space = 500)]
    pub offer: Account<'info, Offer>,

    #[account(mut)]
    pub who_made_the_offer: Signer<'info>,

    #[account(mut, constraint = token_account_from_who_made_the_offer.mint ==  kind_of_token_offered.key())]
    pub token_account_from_who_made_the_offer: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = who_made_the_offer,
        seeds = [offer.key().as_ref()],
        bump = escrow_bump,
        token::mint = kind_of_token_offered,
        token::authority = escrowed_tokens_of_offer_maker,
    )]
    pub escrowed_tokens_of_offer_maker: Account<'info, TokenAccount>,

    pub kind_of_token_offered: Account<'info, Mint>,

    pub kind_of_token_wanted_in_return: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<MakeOffer>,
    escrowed_tokens_of_offer_maker_bump: u8,
    im_offering_this_much: u64,
    duration: u8,
    percent: u8
) -> ProgramResult {
    let offer = &mut ctx.accounts.offer;
    offer.who_made_the_offer = ctx.accounts.who_made_the_offer.key();
    offer.kind_of_token_wanted_in_return = ctx.accounts.kind_of_token_wanted_in_return.key();
    offer.escrowed_tokens_of_offer_maker_bump = escrowed_tokens_of_offer_maker_bump;

    offer.start_time = solana_program::clock::Clock::get().unwrap().unix_timestamp.clone() as i64;
    offer.duration = duration;
    offer.percent = percent;

    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx
                    .accounts
                    .token_account_from_who_made_the_offer
                    .to_account_info(),
                to: ctx
                    .accounts
                    .escrowed_tokens_of_offer_maker
                    .to_account_info(),
                authority: ctx.accounts.who_made_the_offer.to_account_info(),
            },
        ),
        im_offering_this_much,
    )
}
