import { body } from 'express-validator';
import { ClientType, SalesChannel } from '../types';

export const createClientValidation = [
  body('client_type')
    .optional()
    .isIn(Object.values(ClientType))
    .withMessage(`Client type must be one of: ${Object.values(ClientType).join(', ')}`),
  
  body('sales_channel')
    .optional()
    .isIn(Object.values(SalesChannel))
    .withMessage(`Sales channel must be one of: ${Object.values(SalesChannel).join(', ')}`),
    
  body('name')
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Client name must be between 2 and 100 characters')
    .trim(),
    
  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('phone')
    .optional({ nullable: true })
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Phone number contains invalid characters'),
    
  body('address')
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters')
    .trim(),
    
  body('city')
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters')
    .trim(),
    
  body('country')
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters')
    .trim()
];

export const updateClientValidation = [
  body('client_type')
    .optional()
    .isIn(Object.values(ClientType))
    .withMessage(`Client type must be one of: ${Object.values(ClientType).join(', ')}`),
  
  body('sales_channel')
    .optional()
    .isIn(Object.values(SalesChannel))
    .withMessage(`Sales channel must be one of: ${Object.values(SalesChannel).join(', ')}`),
    
  body('code')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Client code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Client code must contain only uppercase letters and numbers'),
    
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Client name must be between 2 and 100 characters')
    .trim(),
    
  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('phone')
    .optional({ nullable: true })
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Phone number contains invalid characters'),
    
  body('address')
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters')
    .trim(),
    
  body('city')
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters')
    .trim(),
    
  body('country')
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters')
    .trim(),
    
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];
