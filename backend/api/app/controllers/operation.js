const Operation = require('../db/models/operation');
const State = require('../db/models/state');
const History = require('../db/models/history');

class OperationController {
    // Check if sales are locked for a specific date and selling point
    async checkSalesLock(req, res) {
        try {
            const { date, sellingPoint, symbol } = req.query;
            
            if (!date || !sellingPoint || !symbol) {
                return res.status(400).json({
                    message: 'Date, sellingPoint, and symbol are required'
                });
            }

            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const existingOperation = await Operation.findOne({
                date: { $gte: startOfDay, $lte: endOfDay },
                sellingPoint: sellingPoint,
                symbol: symbol,
                status: 'active'
            });

            res.json({
                isLocked: !!existingOperation,
                operation: existingOperation
            });

        } catch (error) {
            console.error('Error checking sales lock:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Cancel an operation and rollback all changes
    async cancelOperation(req, res) {
        try {
            const { operationId } = req.params;
            
            const operation = await Operation.findOne({
                operationId: operationId,
                status: 'active'
            });

            if (!operation) {
                return res.status(404).json({
                    message: 'Operation not found or already cancelled'
                });
            }

            // Start rollback process
            const rollbackResults = {
                restoredStates: 0,
                removedHistoryEntries: 0,
                errors: []
            };

            // Rollback in reverse order
            for (let i = operation.changes.length - 1; i >= 0; i--) {
                const change = operation.changes[i];
                
                try {
                    if (change.type === 'delete_state') {
                        // Restore deleted state item
                        const stateData = change.originalData;
                        const restoredState = new State(stateData);
                        await restoredState.save();
                        rollbackResults.restoredStates++;
                        
                    } else if (change.type === 'history_entry') {
                        // Remove history entry
                        await History.findByIdAndDelete(change.changeId);
                        rollbackResults.removedHistoryEntries++;
                    }
                } catch (error) {
                    console.error(`Error rolling back change ${i}:`, error);
                    rollbackResults.errors.push(`Change ${i}: ${error.message}`);
                }
            }

            // Mark operation as cancelled
            operation.status = 'cancelled';
            await operation.save();

            res.json({
                message: 'Operation cancelled successfully',
                operationId: operationId,
                rollbackResults: rollbackResults
            });

        } catch (error) {
            console.error('Error cancelling operation:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Get all operations for a specific date and selling point
    async getOperations(req, res) {
        try {
            const { date, sellingPoint } = req.query;
            
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const operations = await Operation.find({
                date: { $gte: startOfDay, $lte: endOfDay },
                ...(sellingPoint && { sellingPoint: sellingPoint })
            }).populate('userloggedinId', 'email');

            res.json(operations);

        } catch (error) {
            console.error('Error fetching operations:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new OperationController();