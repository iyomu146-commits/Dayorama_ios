require 'xcodeproj'
require 'fileutils'
project_path, source_path = ARGV
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.product_type == 'com.apple.product-type.application' }
raise 'Missing app target' unless target
dest = File.join(File.dirname(project_path), 'BenchNative.mm')
FileUtils.cp(source_path, dest)
ref = project.main_group.new_file('BenchNative.mm')
target.source_build_phase.add_file_reference(ref)
project.save
puts "Added diagnostic sampler to #{target.name}"
