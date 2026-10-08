import Swal from 'sweetalert2';

export const customSwal = Swal.mixin({
  customClass: {
    popup: 'font-[\'Tajawal\',sans-serif] rounded-md shadow-xl text-right',
    title: 'text-base font-bold text-slate-800',
    htmlContainer: 'text-xs text-slate-600',
    confirmButton: 'px-4 py-2 bg-[#03204E] hover:bg-[#02183b] text-white text-xs font-semibold rounded-sm transition-colors mx-1 cursor-pointer',
    cancelButton: 'px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-sm transition-colors mx-1 cursor-pointer',
    denyButton: 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-sm transition-colors mx-1 cursor-pointer',
  },
  buttonsStyling: false,
});

export const showAlert = (title, text = '', icon = 'info') => {
  return customSwal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'حسناً',
    timer: icon === 'success' ? 2500 : undefined,
    timerProgressBar: icon === 'success',
  });
};

export const showSuccess = (title, text = '') => {
  return customSwal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'حسناً',
    timer: 2500,
    timerProgressBar: true,
  });
};

export const showError = (title, text = '') => {
  return customSwal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'حسناً',
  });
};

export const showWarning = (title, text = '') => {
  return customSwal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonText: 'حسناً',
  });
};

export const showConfirm = async (title, text = '', confirmButtonText = 'نعم، تأكيد', cancelButtonText = 'إلغاء') => {
  const result = await customSwal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  });
  return result.isConfirmed;
};

export const showToast = (title, icon = 'success') => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-start',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
  return Toast.fire({
    icon,
    title,
  });
};

export default customSwal;
