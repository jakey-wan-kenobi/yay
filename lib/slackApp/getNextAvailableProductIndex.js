/**
* Run through the list recursively and find the next available product to send back.
* @param {Array} products The products array from the Stripe API.
* @param {Number} index The index of the last product in the products array. We're going to increment this until we find the next available product in the array.
*/

function getNextAvailableProductIndex (products, index) {
  return new Promise(function (resolve, reject) {
    // Increment the index by 1 (or start at 0 if we weren't passed an index)
    let pointer = parseInt(index, 10) || 0
    pointer++

    // If we've reached the end of the products (i.e. that index of the products array is empty), start over at the beginning of the products list (i.e. the 0 index).
    if (!products[pointer]) {
      pointer = 0
    }

    if (pointer > products.length) {
      pointer = 0
    }

    // Check if the product at position products[pointer] has available inventory (recursively)
    _checkIfInventoryElseCheckNext(pointer, products, resolve)
  })
}

function _checkIfInventoryElseCheckNext (pointer, products, resolve) {
  // If, for some reason, there's no product at this pointer, start over
  if (!products[pointer]) {
    let nextPointer = 0
    return _checkIfInventoryElseCheckNext(nextPointer, products, resolve)
  }
  // If the pointer becomes bigger than our array, we've reached the end and should start over
  if (pointer > products.length) {
    let nextPointer = 0
    return _checkIfInventoryElseCheckNext(nextPointer, products, resolve)
  }
  // Check that this product has skus to sell.
  if (!products[pointer].skus || !products[pointer].skus.data[0]) {
    let nextPointer = pointer + 1
    return _checkIfInventoryElseCheckNext(nextPointer, products, resolve)
  }
  // Check that this product has inventory to sell.
  if (!products[pointer].skus.data[0].inventory || products[pointer].skus.data[0].inventory.quantity === 0) {
    let nextPointer = pointer + 1
    // console.log(products)
    return _checkIfInventoryElseCheckNext(nextPointer, products, resolve)
  }
  // If we've gotten here, we're ready to move on with this pointer/product
  let newPointer = pointer
  resolve(newPointer)
  return
}

export default getNextAvailableProductIndex
