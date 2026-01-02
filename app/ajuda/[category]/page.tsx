import { helpCategories } from '../helpData';

export async function generateStaticParams() {
  return helpCategories.map((category) => ({
    category: category.id,
  }));
}

export { default } from '../page';

