use anchor_lang::prelude::*;
use anchor_lang::{solana_program};

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3fVyhGTz9uXRhWmRVjLWCx9ViPRWnz7XUACE2JpMZ3aZ");

#[program]
pub mod nft_bonds {
    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>,
        event_bump: u8,
        escrowed_tokens_of_offer_maker_bump: u8,
        im_offering_this_much: u64
    ) -> ProgramResult {
        instructions::make_offer::handler(
            ctx,
            event_bump,
            escrowed_tokens_of_offer_maker_bump,
            im_offering_this_much
        )
    }

    pub fn accept_offer(ctx: Context<AcceptOffer>) -> ProgramResult {
        instructions::accept_offer::handler(ctx)
    }

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_account_bump: u8,
        duration: u8,
        percent: u8,
    ) -> ProgramResult {
        let event_account = &mut ctx.accounts.event_account;
        event_account.duration = duration;
        event_account.percent = percent;
        event_account.start_time = solana_program::clock::Clock::get().unwrap().unix_timestamp.clone() as i64;
        event_account.authority = ctx.accounts.authority.key();
        event_account.bump = event_account_bump;
        event_account.total_nfts = 0;
        event_account.collected_tokens_amount = 0;
        event_account.full_tokens_amount = 0;

        Ok(())
    }
}

#[account]
pub struct EventAccount {
    pub title: String,
    pub start_time: i64,
    pub duration: u8,
    pub percent: u8,
    pub vesting_time: u8,

    pub collected_tokens_amount: u64,
    pub full_tokens_amount: u64,

    pub total_nfts: u8,

    pub authority: Pubkey,
    pub bump: u8,
}


#[derive(Accounts)]
#[instruction(event_account_bump: u8)]
pub struct CreateEvent<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        seeds = [
            b"event".as_ref(),
            authority.key().as_ref()
        ],
        bump = event_account_bump,
        payer = authority,
        space = 9000
    )]
    pub event_account: Account<'info, EventAccount>,

    pub system_program: Program<'info, System>,
}