-- Trigger-only SECURITY DEFINER function must not be callable through PostgREST RPC.
revoke all on function public.seller_publication_guard() from public, anon, authenticated;
grant execute on function public.seller_publication_guard() to service_role;
