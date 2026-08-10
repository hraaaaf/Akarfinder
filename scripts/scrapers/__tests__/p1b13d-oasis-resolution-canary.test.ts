import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const SQL=readFileSync("supabase/migrations/20260810115000_p1b13d_oasis_resolution_canary.sql","utf8");
const SEEDS=[
 "1c3223d2-8eae-471d-ba14-ea90447aeb2f","2301d915-3d1b-45db-b178-bd2abdc26472","7eacf82f-c374-467a-a3af-53430f82211d","9a7f0328-683c-4783-b46e-4bdc30cb3a86","9f644e9e-f2c0-4b0a-8646-8d4e750a6767",
] as const;
async function fixture(){
 const db=new PGlite();
 await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table public.geo_entities(id text primary key,entity_type text not null,parent_id text,validation_status text not null,map_eligible boolean not null,seo_eligible boolean not null);
  create table public.source_offer_seeds(id uuid primary key,source_domain text not null,metadata jsonb not null default '{}'::jsonb);
  create table public.thin_index_search_documents(seed_id uuid primary key,vertical_classification text not null,document_kind text not null,display_eligibility text not null);
  create table public.property_listings(id bigint primary key,city text not null,district text);
  create table public.geo_resolution_events(id bigint generated always as identity primary key,raw_city text,raw_neighborhood text,resolved_city_id text,resolved_neighborhood_id text,resolution_status text not null,candidates jsonb not null default '[]'::jsonb,source_record_type text not null,source_record_id text not null,resolver_version text not null,created_at timestamptz not null default clock_timestamp());
  insert into public.geo_entities values ('city_casablanca','city',null,'validated',true,true),('district_casablanca_oasis','neighborhood','city_casablanca','validated',false,false);
 `);
 let propertyId=300;
 for(const seed of SEEDS){propertyId++;await db.query(`insert into public.property_listings values($1,'Casablanca','Oasis')`,[propertyId]);await db.query(`insert into public.source_offer_seeds values($1,'mouldar.com',jsonb_build_object('coverage_bridge',jsonb_build_object('property_listing_id',$2::text)))`,[seed,propertyId]);await db.query(`insert into public.thin_index_search_documents values($1,'real_estate_likely','LISTING','eligible_secondary')`,[seed]);}
 await db.exec(SQL);return db;
}
async function one(db:PGlite,sql:string){const r=await db.query<Record<string,unknown>>(sql);return r.rows[0];}

test("P1B.13D preflight is exactly 5 Oasis / 1 source",async()=>{const db=await fixture();assert.deepEqual(await one(db,`select count(*)::int n,count(distinct source_domain)::int s from public.odm_p1b13d_oasis_resolution_candidates_v1`),{n:5,s:1});await db.close();});
test("P1B.13D apply writes five resolved events and becomes non-replayable",async()=>{const db=await fixture();const a=await one(db,`select public.odm_p1b13d_oasis_resolution_apply_v1(5) result`);assert.match(JSON.stringify(a.result),/\"inserted\":5/);assert.deepEqual(await one(db,`select count(*)::int n from public.geo_resolution_events where resolver_version='p1b13d_oasis_authority_canary_v1' and resolution_status='resolved' and resolved_neighborhood_id='district_casablanca_oasis'`),{n:5});assert.deepEqual(await one(db,`select count(*)::int n from public.odm_p1b13d_oasis_resolution_candidates_v1`),{n:0});await assert.rejects(()=>db.query(`select public.odm_p1b13d_oasis_resolution_apply_v1(5)`),/cohort drift/);await db.exec("rollback");await db.close();});
test("P1B.13D fails closed on persisted district drift",async()=>{const db=await fixture();await db.exec(`update public.property_listings set district='Other' where id=(select min(id) from public.property_listings)`);await assert.rejects(()=>db.query(`select public.odm_p1b13d_oasis_resolution_apply_v1(5)`),/cohort drift/);await db.exec("rollback");assert.deepEqual(await one(db,`select count(*)::int n from public.geo_resolution_events`),{n:0});await db.close();});
test("P1B.13D requires protected validated Oasis Registry target",async()=>{for(const mutation of [`update public.geo_entities set validation_status='draft' where id='district_casablanca_oasis'`,`update public.geo_entities set map_eligible=true where id='district_casablanca_oasis'`,`update public.geo_entities set seo_eligible=true where id='district_casablanca_oasis'`]){const db=await fixture();await db.exec(mutation);await assert.rejects(()=>db.query(`select public.odm_p1b13d_oasis_resolution_apply_v1(5)`),/cohort drift/);await db.exec("rollback");await db.close();}});
test("P1B.13D rollback is append-only and restores latest unresolved",async()=>{const db=await fixture();await db.query(`select public.odm_p1b13d_oasis_resolution_apply_v1(5)`);const r=await one(db,`select public.odm_p1b13d_oasis_resolution_rollback_v1(5) result`);assert.match(JSON.stringify(r.result),/\"unresolved_events_inserted\":5/);assert.deepEqual(await one(db,`select count(*)::int n from public.geo_resolution_events`),{n:10});assert.deepEqual(await one(db,`with latest as(select distinct on(source_record_id)* from public.geo_resolution_events order by source_record_id,created_at desc,id desc) select count(*)::int n,bool_and(resolution_status='unresolved') all_unresolved from latest`),{n:5,all_unresolved:true});assert.deepEqual(await one(db,`select count(*)::int n from public.odm_p1b13d_oasis_resolution_candidates_v1`),{n:5});await db.close();});
test("P1B.13D rollback refuses drift if a newer event exists",async()=>{const db=await fixture();await db.query(`select public.odm_p1b13d_oasis_resolution_apply_v1(5)`);await db.query(`insert into public.geo_resolution_events(raw_city,raw_neighborhood,resolution_status,source_record_type,source_record_id,resolver_version) values('Casablanca','Oasis','unresolved','source_offer_seed',$1,'external_newer_v1')`,[SEEDS[0]]);await assert.rejects(()=>db.query(`select public.odm_p1b13d_oasis_resolution_rollback_v1(5)`),/rollback cohort drift/);await db.exec("rollback");await db.close();});
