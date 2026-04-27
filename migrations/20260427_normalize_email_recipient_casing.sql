UPDATE emails
SET to_address = lower(to_address)
WHERE to_address IS NOT NULL
	AND to_address != lower(to_address);
