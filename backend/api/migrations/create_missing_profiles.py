from django.db import migrations

def create_profiles_for_existing_users(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('api', 'UserProfile')
    
    # Get all users
    users = User.objects.all()
    
    # For each user, create a profile if it doesn't exist
    for user in users:
        UserProfile.objects.get_or_create(user=user, defaults={'score': 0})

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),  # This should be the last migration you have
    ]

    operations = [
        migrations.RunPython(create_profiles_for_existing_users),
    ]
