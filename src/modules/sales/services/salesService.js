// SALES REQUEST WORKFLOW
//
//   Sales user creates  ->  PENDING  ->  Admin / Manager approves or cancels
//
//   approve : status -> APPROVED, stock - quantity, one ledger row     (all in ONE transaction)
//   cancel  : status -> CANCELLED, stock untouched
//
// Why this is safe (the rules from the project brief):
//   * Two people approve at once      -> only ONE can flip Pending -> Approved (conditional update)
//   * Approved twice / deducted twice -> the 2nd attempt no longer matches status "Pending", and a unique
//                                        index on the ledger refuses a 2nd SALE row for the same request
//   * Negative stock                  -> stock is decremented only where stockQuantity >= quantity
//   * Stock deducted but status not saved (or the reverse) -> impossible: everything is one transaction
import SalesRequest from '../models/SalesRequest.js';
import Product from '../../products/models/Product.js';
import Warehouse from '../../warehouses/models/Warehouse.js';
import StockTransaction from '../../inventory/models/StockTransaction.js';
import { nextCode } from '../../../database/Counter.js';
import { AppError } from '../../../utils/AppError.js';
import { REQUEST_STATUS, ROLES } from '../../../utils/constants.js';
import { runInTransaction } from '../../../utils/transaction.js';
import { objectId, optString, sanitize, wholeNumber } from '../../../utils/validate.js';

const { PENDING, APPROVED, CANCELLED } = REQUEST_STATUS;

// Sales -> only their own requests.  Admin / Manager -> their warehouse.  Super Admin -> all (read only).
export function list(actor) {
  let filter = {};
  if (actor.role === ROLES.SALES) filter = { salesUserId: actor._id };
  else if (actor.role !== ROLES.SUPER_ADMIN) filter = actor.warehouseId ? { warehouseId: actor.warehouseId } : { _id: null };
  return SalesRequest.find(filter).sort({ createdAt: -1 }).limit(2000);
}

// SALES USER: create a request. Status = Pending. Stock is NOT touched here.
export async function create(actor, body) {
  const data = sanitize(body, {
    productId: { label: 'Product', required: true, parse: (v) => objectId(v, 'Product') },
    quantity: { label: 'Quantity', required: true, parse: (v) => wholeNumber(v, 'Quantity', { min: 1 }) },
    notes: { label: 'Notes', default: '', parse: (v) => optString(v, 'Notes', { max: 500 }) },
  });
  if (!actor.warehouseId) throw new AppError('Your account has no warehouse assigned. Please contact the administrator.', 403);

  // Price, product name and warehouse come from the DATABASE, never from the browser.
  const product = await Product.findOne({ _id: data.productId, warehouseId: actor.warehouseId });
  if (!product) throw new AppError('Product not found.', 404);
  if (product.status !== 'active') throw new AppError('This product is not available for sale.', 409);
  const warehouse = await Warehouse.findById(product.warehouseId);
  if (!warehouse) throw new AppError('Warehouse not found.', 404);
  if (warehouse.status !== 'active') throw new AppError('This warehouse is inactive.', 409);
  // Early, friendly check. The real check is repeated (atomically) at approval time.
  if (data.quantity > product.stockQuantity) throw new AppError('Insufficient stock available.', 409);

  return SalesRequest.create({
    requestNo: await nextCode('SR', 6),
    salesUserId: actor._id,
    salesUserName: actor.name,
    warehouseId: warehouse._id,
    warehouseName: warehouse.name,
    productId: product._id,
    productName: product.name,
    quantity: data.quantity,
    price: product.price,
    totalAmount: Math.round(product.price * data.quantity * 100) / 100,
    status: PENDING,
    notes: data.notes,
  });
}

// Explains WHY a request could not be processed (used only after the atomic update matched nothing).
async function explainFailure(actor, id) {
  const request = await SalesRequest.findOne({ _id: id, warehouseId: actor.warehouseId });
  if (!request) return new AppError('Sales request not found.', 404);
  if (request.status !== PENDING) return new AppError(`This request is already ${request.status.toLowerCase()}.`, 409, 'ALREADY_PROCESSED');
  if (String(request.salesUserId) === String(actor._id)) return new AppError('You cannot process your own request.', 403);
  return new AppError('This request could not be processed. Please refresh and try again.', 409);
}

// The "claim": flips Pending -> newStatus in ONE atomic step. Returns the updated request, or null if the
// request is not Pending (or belongs to another warehouse). Only one caller can ever win this.
function claim(actor, id, newStatus, session) {
  return SalesRequest.findOneAndUpdate(
    { _id: id, status: PENDING, warehouseId: actor.warehouseId, salesUserId: { $ne: actor._id } },
    { $set: { status: newStatus, processedBy: actor._id, processedByName: actor.name, processedAt: new Date() } },
    { new: true, session }
  );
}

const assertId = (id) => objectId(id, 'Sales request');

// ADMIN / MANAGER: approve.
export async function approve(actor, requestId) {
  const id = assertId(requestId);

  const approved = await runInTransaction(async (session) => {
    const request = await claim(actor, id, APPROVED, session);
    if (!request) throw await explainFailure(actor, id);

    // Take the stock ONLY IF enough is left. This single conditional update is the "no negative stock" rule.
    const product = await Product.findOneAndUpdate(
      { _id: request.productId, stockQuantity: { $gte: request.quantity } },
      { $inc: { stockQuantity: -request.quantity } },
      { new: true, session }
    );
    if (!product) {
      // Throwing aborts the transaction: the request goes back to Pending automatically.
      const exists = await Product.exists({ _id: request.productId }).session(session);
      throw new AppError(exists ? 'Insufficient stock available.' : 'Product not found.', exists ? 409 : 404, 'INSUFFICIENT_STOCK');
    }

    await StockTransaction.create(
      [
        {
          type: 'SALE',
          productId: product._id,
          productName: product.name,
          warehouseId: product.warehouseId,
          quantityChange: -request.quantity,
          balanceAfter: product.stockQuantity, // value AFTER the deduction (e.g. 500 - 100 = 400)
          reason: `Sales request ${request.requestNo} approved`,
          requestId: request._id,
          requestNo: request.requestNo,
          performedBy: actor._id,
          performedByName: actor.name,
        },
      ],
      { session }
    );
    return request;
  });
  return approved;
}

// ADMIN / MANAGER: cancel. One atomic update; stock is never touched.
export async function cancel(actor, requestId) {
  const id = assertId(requestId);
  const request = await claim(actor, id, CANCELLED);
  if (!request) throw await explainFailure(actor, id);
  return request;
}
