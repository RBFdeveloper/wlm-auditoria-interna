-- Migração 007 — 5S passa a ser por departamento (sem colaborador)
-- (DOS já é departamento, DTO é colaborador, INMETRO é por casa)
update temas set modo = 'departamento' where codigo = '5S';
