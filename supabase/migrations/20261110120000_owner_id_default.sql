-- ============================================================
-- owner_id preenchido pelo banco
--
-- As políticas de INSERT exigem auth.uid() = owner_id, mas o front-end não
-- envia owner_id: sem este default, todo insert de link ou página era recusado
-- (403). Com o default, o dono é sempre o usuário autenticado da requisição,
-- e o WITH CHECK continua bloqueando quem tentar informar outro owner_id.
-- ============================================================
ALTER TABLE links ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE link_pages ALTER COLUMN owner_id SET DEFAULT auth.uid();
