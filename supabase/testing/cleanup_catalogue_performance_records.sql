-- STAGING ONLY. Removes records created by generate_catalogue_performance_records.sql.
delete from public.products where slug like 'perf-test-%';
