import requests
import sys
import json
from datetime import datetime, timedelta

class FormacionSalonesAPITester:
    def __init__(self, base_url="https://dev-advisor-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.coordinator_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'admin_id': None,
            'coordinator_id': None,
            'salon_ids': [],
            'employee_ids': [],
            'training_type_ids': [],
            'training_ids': [],
            'scheduled_training_ids': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        
        success1, _ = self.run_test("Root endpoint", "GET", "", 200)
        success2, _ = self.run_test("Health check", "GET", "health", 200)
        
        return success1 and success2

    def test_user_registration_and_login(self):
        """Test user registration and login"""
        print("\n=== USER REGISTRATION & LOGIN TESTS ===")
        
        # Test admin registration (first user)
        admin_data = {
            "name": "Admin Test",
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "AdminPass123!"
        }
        
        success, response = self.run_test(
            "Admin registration (first user)",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            self.created_ids['admin_id'] = response['user']['id']
            print(f"   Admin role: {response['user']['role']}")
            
            # Verify admin role
            if response['user']['role'] != 'admin':
                print("❌ First user should be admin")
                return False
        else:
            print("❌ Admin registration failed")
            return False

        # Test coordinator registration (second user)
        coord_data = {
            "name": "Coordinator Test",
            "email": f"coord_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "CoordPass123!"
        }
        
        success, response = self.run_test(
            "Coordinator registration",
            "POST",
            "auth/register",
            200,
            data=coord_data
        )
        
        if success and 'token' in response:
            self.coordinator_token = response['token']
            self.created_ids['coordinator_id'] = response['user']['id']
            print(f"   Coordinator role: {response['user']['role']}")
            
            # Verify coordinator role
            if response['user']['role'] != 'coordinator':
                print("❌ Second user should be coordinator")
                return False
        else:
            print("❌ Coordinator registration failed")
            return False

        # Test login with admin credentials
        login_success, login_response = self.run_test(
            "Admin login",
            "POST",
            "auth/login",
            200,
            data={"email": admin_data["email"], "password": admin_data["password"]}
        )

        # Test /auth/me endpoint
        me_success, _ = self.run_test(
            "Get current user info",
            "GET",
            "auth/me",
            200,
            token=self.admin_token
        )

        return success and login_success and me_success

    def test_salon_management(self):
        """Test salon CRUD operations"""
        print("\n=== SALON MANAGEMENT TESTS ===")
        
        # Test create salon (admin only)
        salon_data = {
            "name": "Salón Test 1",
            "address": "Calle Test 123",
            "city": "Murcia"
        }
        
        success, response = self.run_test(
            "Create salon (admin)",
            "POST",
            "salons",
            200,
            data=salon_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            salon_id = response['id']
            self.created_ids['salon_ids'].append(salon_id)
        else:
            print("❌ Salon creation failed")
            return False

        # Test create salon with coordinator (should fail)
        coord_fail, _ = self.run_test(
            "Create salon (coordinator - should fail)",
            "POST",
            "salons",
            403,
            data=salon_data,
            token=self.coordinator_token
        )

        # Test get salons
        get_success, salons_response = self.run_test(
            "Get salons",
            "GET",
            "salons",
            200,
            token=self.admin_token
        )

        # Test get specific salon
        get_one_success, _ = self.run_test(
            "Get specific salon",
            "GET",
            f"salons/{salon_id}",
            200,
            token=self.admin_token
        )

        # Test update salon
        update_data = {"name": "Salón Test Updated"}
        update_success, _ = self.run_test(
            "Update salon",
            "PUT",
            f"salons/{salon_id}",
            200,
            data=update_data,
            token=self.admin_token
        )

        return success and coord_fail and get_success and get_one_success and update_success

    def test_training_types_management(self):
        """Test training types CRUD operations"""
        print("\n=== TRAINING TYPES MANAGEMENT TESTS ===")
        
        # Test create training type (admin only)
        type_data = {
            "name": "Terminales de Apuestas",
            "description": "Formación sobre uso de terminales"
        }
        
        success, response = self.run_test(
            "Create training type (admin)",
            "POST",
            "training-types",
            200,
            data=type_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            type_id = response['id']
            self.created_ids['training_type_ids'].append(type_id)
        else:
            print("❌ Training type creation failed")
            return False

        # Test create training type with coordinator (should fail)
        coord_fail, _ = self.run_test(
            "Create training type (coordinator - should fail)",
            "POST",
            "training-types",
            403,
            data=type_data,
            token=self.coordinator_token
        )

        # Test get training types
        get_success, _ = self.run_test(
            "Get training types",
            "GET",
            "training-types",
            200,
            token=self.admin_token
        )

        # Test update training type
        update_data = {"name": "Terminales Actualizadas", "description": "Descripción actualizada"}
        update_success, _ = self.run_test(
            "Update training type",
            "PUT",
            f"training-types/{type_id}",
            200,
            data=update_data,
            token=self.admin_token
        )

        return success and coord_fail and get_success and update_success

    def test_employee_management(self):
        """Test employee CRUD operations"""
        print("\n=== EMPLOYEE MANAGEMENT TESTS ===")
        
        if not self.created_ids['salon_ids']:
            print("❌ No salons available for employee creation")
            return False
        
        salon_id = self.created_ids['salon_ids'][0]
        
        # Test create employee
        employee_data = {
            "name": "Empleado Test",
            "salon_id": salon_id,
            "level": "Principiante",
            "notes": "Empleado de prueba"
        }
        
        success, response = self.run_test(
            "Create employee",
            "POST",
            "employees",
            200,
            data=employee_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            employee_id = response['id']
            self.created_ids['employee_ids'].append(employee_id)
        else:
            print("❌ Employee creation failed")
            return False

        # Test get employees
        get_success, _ = self.run_test(
            "Get employees",
            "GET",
            "employees",
            200,
            token=self.admin_token
        )

        # Test get employees by salon
        get_by_salon_success, _ = self.run_test(
            "Get employees by salon",
            "GET",
            f"employees?salon_id={salon_id}",
            200,
            token=self.admin_token
        )

        # Test get specific employee
        get_one_success, _ = self.run_test(
            "Get specific employee",
            "GET",
            f"employees/{employee_id}",
            200,
            token=self.admin_token
        )

        # Test update employee
        update_data = {"level": "Intermedio", "notes": "Actualizado a intermedio"}
        update_success, _ = self.run_test(
            "Update employee",
            "PUT",
            f"employees/{employee_id}",
            200,
            data=update_data,
            token=self.admin_token
        )

        return success and get_success and get_by_salon_success and get_one_success and update_success

    def test_training_management(self):
        """Test training registration"""
        print("\n=== TRAINING MANAGEMENT TESTS ===")
        
        if not self.created_ids['employee_ids'] or not self.created_ids['training_type_ids']:
            print("❌ No employees or training types available")
            return False
        
        employee_id = self.created_ids['employee_ids'][0]
        training_type_id = self.created_ids['training_type_ids'][0]
        
        # Test create training
        training_data = {
            "employee_id": employee_id,
            "training_type_id": training_type_id,
            "notes": "Formación completada satisfactoriamente",
            "level_after": "Avanzado"
        }
        
        success, response = self.run_test(
            "Register training",
            "POST",
            "trainings",
            200,
            data=training_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            training_id = response['id']
            self.created_ids['training_ids'].append(training_id)
        else:
            print("❌ Training registration failed")
            return False

        # Test get trainings
        get_success, _ = self.run_test(
            "Get trainings",
            "GET",
            "trainings",
            200,
            token=self.admin_token
        )

        # Test get trainings by employee
        get_by_emp_success, _ = self.run_test(
            "Get trainings by employee",
            "GET",
            f"trainings?employee_id={employee_id}",
            200,
            token=self.admin_token
        )

        # Test get employee training history
        history_success, _ = self.run_test(
            "Get employee training history",
            "GET",
            f"trainings/employee/{employee_id}/history",
            200,
            token=self.admin_token
        )

        return success and get_success and get_by_emp_success and history_success

    def test_scheduled_training_management(self):
        """Test scheduled training management"""
        print("\n=== SCHEDULED TRAINING MANAGEMENT TESTS ===")
        
        if not self.created_ids['employee_ids'] or not self.created_ids['training_type_ids']:
            print("❌ No employees or training types available")
            return False
        
        employee_id = self.created_ids['employee_ids'][0]
        training_type_id = self.created_ids['training_type_ids'][0]
        
        # Schedule for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Test create scheduled training
        scheduled_data = {
            "employee_id": employee_id,
            "training_type_id": training_type_id,
            "scheduled_date": tomorrow,
            "notes": "Formación programada para mañana"
        }
        
        success, response = self.run_test(
            "Schedule training",
            "POST",
            "scheduled-trainings",
            200,
            data=scheduled_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            scheduled_id = response['id']
            self.created_ids['scheduled_training_ids'].append(scheduled_id)
        else:
            print("❌ Training scheduling failed")
            return False

        # Test get scheduled trainings
        get_success, _ = self.run_test(
            "Get scheduled trainings",
            "GET",
            "scheduled-trainings",
            200,
            token=self.admin_token
        )

        # Test get upcoming trainings only
        get_upcoming_success, _ = self.run_test(
            "Get upcoming trainings",
            "GET",
            "scheduled-trainings?upcoming_only=true",
            200,
            token=self.admin_token
        )

        # Test complete scheduled training
        complete_success, _ = self.run_test(
            "Complete scheduled training",
            "PUT",
            f"scheduled-trainings/{scheduled_id}/complete",
            200,
            token=self.admin_token
        )

        return success and get_success and get_upcoming_success and complete_success

    def test_stats_and_reports(self):
        """Test statistics and reports"""
        print("\n=== STATS AND REPORTS TESTS ===")
        
        # Test get stats
        stats_success, stats_response = self.run_test(
            "Get statistics",
            "GET",
            "stats",
            200,
            token=self.admin_token
        )

        if stats_success:
            print(f"   Total employees: {stats_response.get('total_employees', 0)}")
            print(f"   Total trainings: {stats_response.get('total_trainings', 0)}")

        # Test monthly report
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        monthly_success, monthly_response = self.run_test(
            "Get monthly report",
            "GET",
            f"reports/monthly?year={current_year}&month={current_month}",
            200,
            token=self.admin_token
        )

        if monthly_success:
            print(f"   Monthly trainings: {monthly_response.get('total_trainings', 0)}")

        return stats_success and monthly_success

    def test_user_management_admin(self):
        """Test user management (admin only)"""
        print("\n=== USER MANAGEMENT TESTS ===")
        
        # Test get users (admin only)
        get_users_success, users_response = self.run_test(
            "Get users (admin)",
            "GET",
            "users",
            200,
            token=self.admin_token
        )

        if get_users_success:
            print(f"   Total users: {len(users_response)}")

        # Test get users with coordinator token (should fail)
        coord_fail, _ = self.run_test(
            "Get users (coordinator - should fail)",
            "GET",
            "users",
            403,
            token=self.coordinator_token
        )

        # Test assign salons to coordinator
        if self.created_ids['salon_ids'] and self.created_ids['coordinator_id']:
            assign_data = {
                "coordinator_id": self.created_ids['coordinator_id'],
                "salon_ids": self.created_ids['salon_ids']
            }
            
            assign_success, _ = self.run_test(
                "Assign salons to coordinator",
                "POST",
                "users/assign-salons",
                200,
                data=assign_data,
                token=self.admin_token
            )
        else:
            assign_success = True  # Skip if no data available

        return get_users_success and coord_fail and assign_success

    def test_send_reminders(self):
        """Test send reminders functionality"""
        print("\n=== SEND REMINDERS TEST ===")
        
        # Test send reminders (admin only)
        success, response = self.run_test(
            "Send reminders",
            "POST",
            "send-reminders",
            200,
            token=self.admin_token
        )

        if success:
            print(f"   Reminders sent: {response.get('message', 'N/A')}")

        return success

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n=== CLEANUP TEST DATA ===")
        
        # Delete scheduled trainings
        for scheduled_id in self.created_ids['scheduled_training_ids']:
            self.run_test(
                f"Delete scheduled training {scheduled_id}",
                "DELETE",
                f"scheduled-trainings/{scheduled_id}",
                200,
                token=self.admin_token
            )

        # Delete employees
        for employee_id in self.created_ids['employee_ids']:
            self.run_test(
                f"Delete employee {employee_id}",
                "DELETE",
                f"employees/{employee_id}",
                200,
                token=self.admin_token
            )

        # Delete training types
        for type_id in self.created_ids['training_type_ids']:
            self.run_test(
                f"Delete training type {type_id}",
                "DELETE",
                f"training-types/{type_id}",
                200,
                token=self.admin_token
            )

        # Delete salons
        for salon_id in self.created_ids['salon_ids']:
            self.run_test(
                f"Delete salon {salon_id}",
                "DELETE",
                f"salons/{salon_id}",
                200,
                token=self.admin_token
            )

        # Delete coordinator user
        if self.created_ids['coordinator_id']:
            self.run_test(
                f"Delete coordinator {self.created_ids['coordinator_id']}",
                "DELETE",
                f"users/{self.created_ids['coordinator_id']}",
                200,
                token=self.admin_token
            )

def main():
    """Run all tests"""
    print("🚀 Starting FormaSalones API Tests")
    print("=" * 50)
    
    tester = FormacionSalonesAPITester()
    
    # Run all test suites
    test_results = []
    
    test_results.append(("Health Check", tester.test_health_check()))
    test_results.append(("User Registration & Login", tester.test_user_registration_and_login()))
    test_results.append(("Salon Management", tester.test_salon_management()))
    test_results.append(("Training Types Management", tester.test_training_types_management()))
    test_results.append(("Employee Management", tester.test_employee_management()))
    test_results.append(("Training Management", tester.test_training_management()))
    test_results.append(("Scheduled Training Management", tester.test_scheduled_training_management()))
    test_results.append(("Stats and Reports", tester.test_stats_and_reports()))
    test_results.append(("User Management", tester.test_user_management_admin()))
    test_results.append(("Send Reminders", tester.test_send_reminders()))
    
    # Cleanup
    tester.cleanup_test_data()
    
    # Print final results
    print("\n" + "=" * 50)
    print("📊 FINAL TEST RESULTS")
    print("=" * 50)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nTotal Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    # Return exit code
    all_passed = all(result for _, result in test_results)
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())