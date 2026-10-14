const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const propertyController = require('../controllers/propertyController');
const buildingController = require('../controllers/buildingController');
const floorController = require('../controllers/floorController');
const unitController = require('../controllers/unitController');
const tenantController = require('../controllers/tenantController');
const agreementController = require('../controllers/agreementController');
const ledgerController = require('../controllers/ledgerController');
const depositController = require('../controllers/depositController');
const maintenanceController = require('../controllers/maintenanceController');
const documentController = require('../controllers/documentController');
const evidenceController = require('../controllers/evidenceController');
const notificationController = require('../controllers/notificationController');
const whatsappController = require('../controllers/whatsappController');
const aiController = require('../controllers/aiController');
const analyticsController = require('../controllers/analyticsController');

const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Protected Auth Routes
router.use(authenticateToken);
router.get('/auth/me', authController.getMe);
router.get('/auth/tenants-list', requireRole('OWNER'), authController.getTenantsList);

// Property Routes
router.get('/properties', propertyController.getProperties);
router.get('/properties/:id/tree', propertyController.getPropertyTree);
router.post('/properties', requireRole('OWNER'), propertyController.createProperty);
router.put('/properties/:id', requireRole('OWNER'), propertyController.updateProperty);
router.delete('/properties/:id', requireRole('OWNER'), propertyController.deleteProperty);

// Building Routes
router.post('/buildings', requireRole('OWNER'), buildingController.createBuilding);
router.put('/buildings/:id', requireRole('OWNER'), buildingController.updateBuilding);
router.delete('/buildings/:id', requireRole('OWNER'), buildingController.deleteBuilding);

// Floor Routes
router.post('/floors', requireRole('OWNER'), floorController.createFloor);
router.delete('/floors/:id', requireRole('OWNER'), floorController.deleteFloor);

// Unit Routes
router.get('/units', unitController.getUnits);
router.post('/units', requireRole('OWNER'), unitController.createUnit);
router.put('/units/:id', requireRole('OWNER'), unitController.updateUnit);
router.delete('/units/:id', requireRole('OWNER'), unitController.deleteUnit);

// Tenant Routes
router.get('/tenants', tenantController.getTenants);
router.post('/tenants/assign', requireRole('OWNER'), tenantController.assignTenant);
router.post('/tenants/move-out', requireRole('OWNER'), tenantController.moveOutTenant);

// Agreement Routes
router.get('/agreements', agreementController.getAgreements);
router.post('/agreements/upload', upload.single('document'), agreementController.uploadAgreement);

// Rent Ledger Routes
router.get('/ledger', ledgerController.getRentLedger);
router.post('/ledger/obligations', requireRole('OWNER'), ledgerController.createRentObligation);
router.post('/ledger/payments', upload.single('receipt'), ledgerController.recordPayment);
router.get('/ledger/obligations/:obligation_id/payments', ledgerController.getObligationPayments);

// Deposit & Move-out Settlement Routes
router.get('/deposits', depositController.getDepositSettlements);
router.post('/deposits/settle', requireRole('OWNER'), depositController.createOrUpdateSettlement);

// Maintenance Routes
router.get('/maintenance', maintenanceController.getMaintenanceRequests);
router.post('/maintenance', upload.single('evidence'), maintenanceController.createMaintenanceRequest);
router.patch('/maintenance/:id/status', requireRole('OWNER'), maintenanceController.updateMaintenanceStatus);

// Document Routes
router.get('/documents', documentController.getDocuments);
router.post('/documents/upload', upload.single('file'), documentController.uploadDocument);
router.delete('/documents/:id', documentController.deleteDocument);

// Evidence Locker Routes
router.get('/evidence', evidenceController.getEvidence);
router.post('/evidence/upload', upload.single('file'), evidenceController.uploadEvidence);

// Notification Routes
router.get('/notifications', notificationController.getNotifications);
router.patch('/notifications/:id/read', notificationController.markNotificationAsRead);

// WhatsApp Generator Route
router.post('/whatsapp/generate', whatsappController.generateWhatsAppMessage);

// AI Rental Assistant Routes
router.get('/ai/conversations', aiController.getConversations);
router.get('/ai/conversations/:conversation_id/messages', aiController.getMessages);
router.post('/ai/chat', aiController.sendMessage);

// Dashboard & Analytics
router.get('/analytics/dashboard', analyticsController.getDashboardAnalytics);

module.exports = router;
