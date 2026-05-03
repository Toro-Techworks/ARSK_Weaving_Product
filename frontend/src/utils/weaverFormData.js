export function appendWeaverFieldsToFormData(fd, form) {
  fd.append('employee_code', String(form.employee_code || '').trim());
  fd.append('weaver_name', String(form.weaver_name || '').trim());
  fd.append('phone', String(form.phone ?? '').trim());
  fd.append('address', String(form.address ?? ''));
  if (form.joining_date) {
    fd.append('joining_date', form.joining_date);
  }
  fd.append('status', form.status || 'Active');
  fd.append('account_number', String(form.account_number ?? '').trim());
  fd.append('aadhar_number', String(form.aadhar_number ?? '').replace(/\D/g, '').slice(0, 12));
  fd.append('pan_number', String(form.pan_number ?? '').trim().toUpperCase());
}
