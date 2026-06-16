// Quick script to list categories and show one product's category
import { connectDb } from '../config/db.js';
import { CategoryModel } from '../models/category.model.js';
import { ProductModel } from '../models/product.model.js';

const main = async () => {
  await connectDb();
  const categories = await CategoryModel.find({}).select('name slug').lean();
  console.log('Categories:');
  categories.forEach((c) => console.log(`${c._id}  |  ${c.slug}  |  ${c.name}`));

  const product = await ProductModel.findOne({}).select('slug category').lean();
  if (product) {
    console.log('\nExample product:');
    console.log(`slug: ${product.slug}`);
    console.log(`category: ${product.category}`);
  } else {
    console.log('\nNo products found');
  }
  process.exit(0);
};

main().catch((err) => { console.error(err); process.exit(1); });
