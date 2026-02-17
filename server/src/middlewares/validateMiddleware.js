const { ZodError } = require('zod');

function formatIssues(issues) {
  return issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

function validateSchema(schema, source) {
  if (!schema) {
    return undefined;
  }

  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const error = new Error('Payload invalido');
    error.statusCode = 400;
    error.publicCode = 'VALIDATION_ERROR';
    error.publicMessage = 'Payload invalido';
    error.details = formatIssues(parsed.error.issues);
    throw error;
  }

  return parsed.data;
}

function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      const parsedBody = validateSchema(body, req.body);
      const parsedParams = validateSchema(params, req.params);
      const parsedQuery = validateSchema(query, req.query);

      if (parsedBody !== undefined) req.body = parsedBody;
      if (parsedParams !== undefined) req.params = parsedParams;
      if (parsedQuery !== undefined) req.query = parsedQuery;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        error.statusCode = 400;
        error.publicCode = 'VALIDATION_ERROR';
        error.publicMessage = 'Payload invalido';
        error.details = formatIssues(error.issues);
      }

      return next(error);
    }
  };
}

module.exports = {
  validate,
};
