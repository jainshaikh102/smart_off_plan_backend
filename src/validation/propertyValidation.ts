import Joi from "joi";

// Validation schema for property query parameters
export const getPropertiesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string()
    .valid(
      "completion_asc",
      "completion_desc",
      "price_asc",
      "price_desc",
      "name_asc",
      "name_desc",
      "featured"
    )
    .optional(),
  area: Joi.string().trim().max(100).optional(),
  developer: Joi.string().trim().max(100).optional(),
  status: Joi.string().trim().max(50).optional(),
  min_price: Joi.number().integer().min(0).max(100000000).optional(),
  max_price: Joi.number().integer().min(0).max(100000000).optional(),
});

// Validation schema for property ID parameter
export const propertyIdSchema = Joi.object({
  id: Joi.number().integer().min(1).required(),
});

// Validation schema for search query
export const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
  limit: Joi.number().integer().min(1).max(50).optional(),
});

// Validation middleware factory
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: errorMessage,
        details: error.details,
      });
    }

    req.query = value;
    next();
  };
};

// Validation middleware for parameters
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: errorMessage,
        details: error.details,
      });
    }

    req.params = value;
    next();
  };
};
