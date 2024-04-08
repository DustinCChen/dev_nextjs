'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
// import { error } from 'console';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export type State = {
  errors?:{
    customerId?:string[],
    amount?:string[],
    status?:string[],
  };
  message?:string|null;
  // formData?:FormData;
}
const FormScheme = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error:'Please select a customer',
  }),
  amount: z.coerce
  .number()
  .gt(0,{message:'Please enter a valid amount greater than $0.',}
  ),
  status: z.enum(['pending', 'paid'],{
    invalid_type_error:'Please select an invoice status',
  }),
  date: z.string(),
});

const CreateInvoice = FormScheme.omit({
  id: true,
  date: true,
});

export async function createInvoice(prevState: State,formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId:formData.get('customerId'),
    amount:formData.get('amount'),
    status:formData.get('status'),
  })
  if(!validatedFields.success){
    return {
      errors:validatedFields.error.flatten().fieldErrors,
      message:'Missing Fields,Failed to Create Invoice.',
    }
  }
  const { customerId, amount, status } = validatedFields.data;
  // console.log(rawFormData);
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql`INSERT INTO invoices (customer_id, amount, status, date)
  VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  );`;
  } catch (error) {
    return {
      message: 'Database Error:Faild to Create Invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// export async function createInvoice(formData: FormData) {
//   const rawFormData = CreateInvoice.parse(Object.fromEntries(formData));
//   console.log(rawFormData);
// }
// export async function createInvoice(formData:FormData) {
//  const rawFormData = {
//   // https://developer.mozilla.org/en-US/docs/Web/API/FormData/get
//   //原生JS标准API
//   customerId: formData.get('customerId'),
//   amount: formData.get('amount'),
//   status: formData.get('status'),
//  };
//  console.log(rawFormData as any);
//  console.log(typeof rawFormData.amount);
//  console.log(typeof rawFormData.status);
// }

const UpdateInvoice = FormScheme.omit({
  id: true,
  date: true,
});

export async function updateInvoice(
  id: string, 
  prevState:State,
  formData: FormData
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
 
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try {
    await sql`
    UPDATE invoices
    SET
    customer_id = ${customerId},
    amount = ${amountInCents},
    status = ${status}
    WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: 'Database Error:Faild to Update Invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to delete invoice.');
  try {
    await sql`
    DELETE FROM invoices
    WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: 'Database Error:Faild to Delete Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
